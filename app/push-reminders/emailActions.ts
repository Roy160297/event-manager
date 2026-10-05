"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
import {
  renderEmailBody,
  renderEmailSubject,
  resolveEmailTargetDate,
  type EmailReminderEvent,
} from "@/lib/emailReminders";
import { draftEmailRule, type EmailRuleDraft } from "@/lib/ruleDraft";
import type { EmailReminderAnchor, EmailReminderRuleRow } from "@/lib/types";

const ANCHORS: EmailReminderAnchor[] = ["couple_meeting_date", "event_date"];

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

// Typed-in addresses are no longer offered (recipients are picked from the
// list), but a few existing rules still carry some; those are left exactly as
// they are on edit and still count as a recipient (hasLegacyExtras).
function readEmailRuleFields(formData: FormData, hasLegacyExtras = false) {
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

  const runWindowRaw = String(formData.get("run_window") ?? "");
  if (!["any", "morning", "evening"].includes(runWindowRaw)) throw new Error("יש לבחור שעת שליחה");
  const runWindow = runWindowRaw === "any" ? null : (runWindowRaw as "morning" | "evening");

  const toEventManager = formData.get("to_event_manager") === "on";
  const toFloorManager = formData.get("to_floor_manager") === "on";
  const toSalesperson = formData.get("to_salesperson") === "on";
  const roleIds = formData.getAll("recipient_role_ids").map(String).filter(Boolean);
  const staffIds = formData.getAll("recipient_staff_ids").map(String).filter(Boolean);
  if (!toEventManager && !toFloorManager && !toSalesperson && roleIds.length === 0 && staffIds.length === 0 && !hasLegacyExtras) {
    throw new Error("יש לבחור לפחות נמען אחד");
  }

  return {
    title,
    anchor,
    offset_days: offsetDays,
    fallback_offset_days: fallbackOffsetDays,
    run_window: runWindow,
    to_event_manager: toEventManager,
    to_floor_manager: toFloorManager,
    to_salesperson: toSalesperson,
    recipient_role_ids: roleIds,
    recipient_staff_ids: staffIds,
    subject,
    body,
  };
}

// A new reminder catches up: an event created (or edited) after the chosen
// date has passed, but that hasn't happened yet, still gets it once,
// immediately. To keep that from firing for every event that already exists
// the moment the rule is created, the upcoming events whose date has already
// passed are marked as handled up front - only events from here on catch up.
async function markMissedEventsAsHandled(rule: EmailReminderRuleRow) {
  try {
    const admin = createAdminClient();
    const today = todayInIsrael();
    const { data: events } = await admin
      .from("events")
      .select("id, event_type, event_date, couple_meeting_date")
      .is("deleted_at", null)
      .gte("event_date", today)
      .returns<{ id: string; event_type: string; event_date: string; couple_meeting_date: string | null }[]>();

    const missed = (events ?? []).filter((event) => {
      if (event.event_type === "business_event") return false;
      const target = resolveEmailTargetDate(rule, event);
      return !!target && target < today;
    });
    if (missed.length === 0) return;

    await admin
      .from("reminder_log")
      .insert(missed.map((event) => ({ event_id: event.id, rule_key: rule.rule_key, sent_date: today })));
  } catch (err) {
    console.error(`markMissedEventsAsHandled failed for rule ${rule.rule_key}:`, err);
  }
}

export async function createEmailReminderRule(formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();
  const { data: rule, error } = await supabase
    .from("email_reminder_rules")
    .insert({
      ...readEmailRuleFields(formData),
      rule_key: `custom-${crypto.randomUUID()}`,
      match_mode: "on_or_after",
    })
    .select("*")
    .single<EmailReminderRuleRow>();
  if (error) throw new Error(error.message);
  await markMissedEventsAsHandled(rule);
  revalidatePath("/push-reminders");
}

export async function updateEmailReminderRule(ruleId: string, formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("email_reminder_rules")
    .select("extra_emails")
    .eq("id", ruleId)
    .maybeSingle<{ extra_emails: string | null }>();
  const { error } = await supabase
    .from("email_reminder_rules")
    .update({ ...readEmailRuleFields(formData, !!existing?.extra_emails), active: formData.get("active") === "on" })
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

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, roles(name)")
    .order("name")
    .returns<{ id: string; name: string; roles: { name: string } | null }[]>();
  return draftEmailRule(text, {
    staff: (staff ?? []).map((member) => ({ id: member.id, name: member.name, roleName: member.roles?.name ?? null })),
  });
}
