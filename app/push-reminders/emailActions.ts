"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { renderEmailBody, renderEmailSubject, splitEmails, type EmailReminderEvent } from "@/lib/emailReminders";
import { draftEmailRule, type EmailRuleDraft } from "@/lib/ruleDraft";
import type { EmailReminderAnchor, EmailReminderCondition } from "@/lib/types";

const ANCHORS: EmailReminderAnchor[] = ["couple_meeting_date", "event_date"];
const CONDITIONS: EmailReminderCondition[] = ["none", "additional_info_filled", "supplier_dj_tzach_ziv"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertCanManage() {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "push_reminder_rules")) {
    throw new Error("אין לך הרשאה לנהל תזכורות");
  }
  return staff;
}

function optionalInteger(raw: FormDataEntryValue | null, label: string): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isInteger(value)) throw new Error(`${label} חייב להיות מספר שלם`);
  return value;
}

function readEmailRuleFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !subject || !body) throw new Error("יש למלא שם, נושא ותוכן");

  const anchor = String(formData.get("anchor") ?? "") as EmailReminderAnchor;
  if (!ANCHORS.includes(anchor)) throw new Error("נקודת הייחוס אינה תקינה");

  const offsetDays = optionalInteger(formData.get("offset_days"), "מספר הימים");
  if (offsetDays === null) throw new Error("יש להזין מספר ימים");
  // Only meaningful when anchored on the couple meeting; cleared otherwise so
  // a stale value can't linger after switching the anchor.
  let fallbackOffsetDays: number | null = null;
  if (anchor === "couple_meeting_date") {
    const fallbackMode = String(formData.get("fallback_mode") ?? "");
    if (fallbackMode === "event") {
      fallbackOffsetDays = optionalInteger(formData.get("fallback_offset_days"), "מספר הימים החלופי");
      if (fallbackOffsetDays === null) throw new Error("יש להזין ימים ביחס לתאריך האירוע");
    } else if (fallbackMode !== "skip") {
      throw new Error("יש לבחור מה לעשות אם לא הוזן תאריך פגישה");
    }
  }

  const matchMode = String(formData.get("match_mode") ?? "");
  if (matchMode !== "exact" && matchMode !== "on_or_after") throw new Error("יש לבחור מה לעשות אם המועד כבר עבר");
  const runWindowRaw = String(formData.get("run_window") ?? "");
  if (!["any", "morning", "evening"].includes(runWindowRaw)) throw new Error("יש לבחור שעת שליחה");
  const runWindow = runWindowRaw === "any" ? null : (runWindowRaw as "morning" | "evening");

  const condition = String(formData.get("condition") ?? "none") as EmailReminderCondition;
  if (!CONDITIONS.includes(condition)) throw new Error("התנאי אינו תקין");

  const extraEmails = splitEmails(String(formData.get("extra_emails") ?? ""));
  const invalid = extraEmails.find((email) => !EMAIL_PATTERN.test(email));
  if (invalid) throw new Error(`כתובת אימייל לא תקינה: ${invalid}`);

  const toEventManager = formData.get("to_event_manager") === "on";
  const toSalesperson = formData.get("to_salesperson") === "on";
  if (!toEventManager && !toSalesperson && extraEmails.length === 0) {
    throw new Error("יש לבחור לפחות נמען אחד");
  }

  return {
    title,
    anchor,
    offset_days: offsetDays,
    fallback_offset_days: fallbackOffsetDays,
    match_mode: matchMode,
    run_window: runWindow,
    condition,
    to_event_manager: toEventManager,
    to_salesperson: toSalesperson,
    extra_emails: extraEmails.length > 0 ? extraEmails.join(", ") : null,
    subject,
    body,
  };
}

export async function createEmailReminderRule(formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("email_reminder_rules").insert(readEmailRuleFields(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

export async function updateEmailReminderRule(ruleId: string, formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_reminder_rules")
    .update({ ...readEmailRuleFields(formData), active: formData.get("active") === "on" })
    .eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

export async function deleteEmailReminderRule(ruleId: string) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("email_reminder_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

const SAMPLE_EVENT: EmailReminderEvent = {
  name: "אירוע לדוגמה",
  event_type: "wedding",
  event_date: "2026-12-31",
  couple_meeting_date: null,
  estimated_guests: "200+14",
  kids_meal_count: "10",
  glat_meal_count: "5",
  vegetarian_meal_count: "8",
  vegan_meal_count: "3",
  gluten_free_meal_count: "2",
  toddlers_under_2_count: "1",
  menu_notes: "זהו מידע נוסף לדוגמה\n(באימייל אמיתי יופיע כאן המידע הנוסף של האירוע בפועל)",
};

// Always sent only to the current user, never the rule's recipients - a test
// should never reach real staff - and filled with clearly-labeled sample data.
export async function sendTestEmailReminderRule(ruleId: string): Promise<{ to: string }> {
  const staff = await assertCanManage();
  if (!staff.email) throw new Error("לא מוגדרת כתובת אימייל למשתמש שלך");

  const supabase = await createClient();
  const { data: rule, error } = await supabase
    .from("email_reminder_rules")
    .select("subject, body")
    .eq("id", ruleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!rule) throw new Error("התזכורת לא נמצאה");

  await sendReminderEmail({
    to: staff.email,
    subject: `[בדיקה] ${renderEmailSubject(rule.subject, SAMPLE_EVENT)}`,
    bodyText: renderEmailBody(rule.body, SAMPLE_EVENT),
  });
  return { to: staff.email };
}

// Free-text request -> a draft for the "new email reminder" form. Creates
// nothing: the user reviews the draft and completes the missing fields first.
export async function draftEmailRuleFromText(request: string): Promise<EmailRuleDraft> {
  await assertCanManage();
  const text = request.trim();
  if (!text) throw new Error("יש לכתוב מה התזכורת צריכה לעשות");
  if (text.length > 1000) throw new Error("התיאור ארוך מדי");
  return draftEmailRule(text);
}
