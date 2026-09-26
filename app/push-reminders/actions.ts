"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import type { PushReminderRecipientType } from "@/lib/types";

const RECIPIENT_TYPES: PushReminderRecipientType[] = ["event_manager", "floor_manager", "role", "fixed_staff"];

async function assertCanManage() {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "push_reminder_rules")) {
    throw new Error("אין לך הרשאה לנהל התראות");
  }
}

function readRuleFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const anchorLabel = String(formData.get("anchor_label") ?? "").trim();
  const offsetMinutes = Number(formData.get("offset_minutes"));
  const notificationTitle = String(formData.get("notification_title") ?? "").trim();
  const notificationBody = String(formData.get("notification_body") ?? "").trim();

  if (!title || !anchorLabel || !notificationTitle || !notificationBody) {
    throw new Error("יש למלא את כל השדות");
  }
  if (!Number.isFinite(offsetMinutes)) throw new Error("מספר הדקות אינו תקין");

  const recipientTypeRaw = String(formData.get("recipient_type") ?? "");
  if (!RECIPIENT_TYPES.includes(recipientTypeRaw as PushReminderRecipientType)) {
    throw new Error("סוג נמען אינו תקין");
  }
  const recipientType = recipientTypeRaw as PushReminderRecipientType;

  const recipientRoleId = String(formData.get("recipient_role_id") ?? "").trim() || null;
  const recipientStaffId = String(formData.get("recipient_staff_id") ?? "").trim() || null;
  if (recipientType === "role" && !recipientRoleId) throw new Error("יש לבחור תפקיד");
  if (recipientType === "fixed_staff" && !recipientStaffId) throw new Error("יש לבחור איש צוות");

  return {
    title,
    anchor_label: anchorLabel,
    offset_minutes: offsetMinutes,
    notification_title: notificationTitle,
    notification_body: notificationBody,
    recipient_type: recipientType,
    // Only the field matching the chosen type is kept - the others are
    // cleared so a stale role/staff selection can't linger after switching
    // recipient type back and forth.
    recipient_role_id: recipientType === "role" ? recipientRoleId : null,
    recipient_staff_id: recipientType === "fixed_staff" ? recipientStaffId : null,
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

  const { error } = await supabase
    .from("push_reminder_rules")
    .update({ ...readRuleFields(formData), active: formData.get("active") === "on" })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}

export async function deletePushReminderRule(ruleId: string) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("push_reminder_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/push-reminders");
}
