"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { sendPushToStaff } from "@/lib/pushNotifications";
import { draftPushRule, type PushRuleDraft } from "@/lib/ruleDraft";
import { getKnownTimelineStepLabels } from "@/app/events/[id]/timeline/actions";

async function assertCanManage() {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "push_reminder_rules")) {
    throw new Error("אין לך הרשאה לנהל התראות");
  }
}

// Older rules may target a whole role; that stays as it is on edit (the form
// no longer offers roles) and still counts as a recipient (hasLegacyRoles).
function readRuleFields(formData: FormData, hasLegacyRoles = false) {
  const title = String(formData.get("title") ?? "").trim();
  const anchorLabel = String(formData.get("anchor_label") ?? "").trim();
  const offsetMinutes = Number(formData.get("offset_minutes"));
  const notificationTitle = String(formData.get("notification_title") ?? "").trim();
  const notificationBody = String(formData.get("notification_body") ?? "").trim();

  if (!title || !anchorLabel || !notificationTitle || !notificationBody) {
    throw new Error("יש למלא את כל השדות");
  }
  if (!Number.isFinite(offsetMinutes)) throw new Error("מספר הדקות אינו תקין");

  const toEventManager = formData.get("to_event_manager") === "on";
  const toFloorManager = formData.get("to_floor_manager") === "on";
  const toSalesperson = formData.get("to_salesperson") === "on";
  const staffIds = formData.getAll("recipient_staff_ids").map(String).filter(Boolean);
  if (!toEventManager && !toFloorManager && !toSalesperson && staffIds.length === 0 && !hasLegacyRoles) {
    throw new Error("יש לבחור לפחות נמען אחד");
  }

  return {
    title,
    anchor_label: anchorLabel,
    offset_minutes: offsetMinutes,
    notification_title: notificationTitle,
    notification_body: notificationBody,
    to_event_manager: toEventManager,
    to_floor_manager: toFloorManager,
    to_salesperson: toSalesperson,
    recipient_staff_ids: staffIds,
  };
}

export async function createPushReminderRule(formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();

  const { error } = await supabase.from("push_reminder_rules").insert(readRuleFields(formData));

  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

export async function updatePushReminderRule(ruleId: string, formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("push_reminder_rules")
    .select("recipient_role_ids")
    .eq("id", ruleId)
    .maybeSingle<{ recipient_role_ids: string[] }>();
  const { error } = await supabase
    .from("push_reminder_rules")
    .update({
      ...readRuleFields(formData, (existing?.recipient_role_ids.length ?? 0) > 0),
      active: formData.get("active") === "on",
    })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

// Always sent only to the current user, never the rule's configured
// recipient (event manager, a role, etc.) - a test send should never reach
// real staff. No specific event is driving this send, so {event_name} and
// {additional_info} are filled with clearly-labeled example text instead of
// real data - showing the raw unresolved "{event_name}" syntax read like a
// bug rather than a preview.
export async function sendTestPushReminderRule(ruleId: string): Promise<{ sent: number; total: number }> {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "push_reminder_rules")) {
    throw new Error("אין לך הרשאה לנהל התראות");
  }

  const supabase = await createClient();
  const { data: rule, error } = await supabase
    .from("push_reminder_rules")
    .select("notification_title, notification_body")
    .eq("id", ruleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!rule) throw new Error("ההתראה לא נמצאה");

  const body = rule.notification_body
    .replaceAll("{event_name}", "אירוע לדוגמה")
    .replaceAll("{additional_info}", "זהו מידע נוסף לדוגמה (בהתראה אמיתית יופיע כאן המידע הנוסף של האירוע בפועל)");

  return sendPushToStaff(staff.id, { title: rule.notification_title, body });
}

export async function deletePushReminderRule(ruleId: string) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("push_reminder_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

// Free-text request -> a draft for the "new push notification" form. Creates
// nothing: the user reviews the draft and completes the missing fields first.
export async function draftPushRuleFromText(request: string): Promise<PushRuleDraft> {
  await assertCanManage();
  const text = request.trim();
  if (!text) throw new Error("יש לכתוב מה ההתראה צריכה לעשות");
  if (text.length > 1000) throw new Error("התיאור ארוך מדי");

  const supabase = await createClient();
  const [{ data: staff }, stepLabels] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, roles(name)")
      .order("name")
      .returns<{ id: string; name: string; roles: { name: string } | null }[]>(),
    getKnownTimelineStepLabels(),
  ]);
  return draftPushRule(text, {
    stepLabels,
    staff: (staff ?? []).map((member) => ({ id: member.id, name: member.name, roleName: member.roles?.name ?? null })),
  });
}
