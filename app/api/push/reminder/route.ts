import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToStaff } from "@/lib/pushNotifications";
import type { PushReminderRuleRow } from "@/lib/types";

type RuleForRecipients = Pick<
  PushReminderRuleRow,
  "to_event_manager" | "to_floor_manager" | "to_salesperson" | "recipient_role_ids" | "recipient_staff_ids"
>;
type EventForRecipients = { manager_id: string | null; floor_manager_id: string | null; sales_person_id: string | null };

// A rule can go to any mix of the event's own manager / floor manager /
// salesperson and specific staff members (plus, for older rules, everyone
// holding a role), so this always returns a de-duplicated list.
async function resolveRecipientStaffIds(
  supabase: SupabaseClient,
  rule: RuleForRecipients,
  event: EventForRecipients,
): Promise<string[]> {
  const ids = new Set<string>(rule.recipient_staff_ids);
  if (rule.to_event_manager && event.manager_id) ids.add(event.manager_id);
  if (rule.to_floor_manager && event.floor_manager_id) ids.add(event.floor_manager_id);
  if (rule.to_salesperson && event.sales_person_id) ids.add(event.sales_person_id);
  if (rule.recipient_role_ids.length > 0) {
    const { data } = await supabase.from("staff").select("id").in("role_id", rule.recipient_role_ids);
    for (const row of (data ?? []) as { id: string }[]) ids.add(row.id);
  }
  return [...ids];
}

// Called by a one-time pg_cron + pg_net job that schedule_push_reminders_for_step()
// (see the 00000000000058 migration) schedules per (push_reminder_rules row,
// event) whenever a timeline step matching that rule's anchor_label is
// inserted/edited - see app/events/[id]/timeline/actions.ts.
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { eventId, ruleId } = await request.json();
  if (!eventId || typeof eventId !== "string" || !ruleId || typeof ruleId !== "string") {
    return Response.json({ error: "Missing eventId/ruleId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const [{ data: event }, { data: rule }] = await Promise.all([
    supabase
      .from("events")
      .select("name, manager_id, floor_manager_id, sales_person_id, menu_notes")
      .eq("id", eventId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("push_reminder_rules")
      .select(
        "notification_title, notification_body, active, to_event_manager, to_floor_manager, to_salesperson, recipient_role_ids, recipient_staff_ids",
      )
      .eq("id", ruleId)
      .maybeSingle<PushReminderRuleRow>(),
  ]);

  if (!event || !rule?.active) {
    return Response.json({ ok: true, sent: 0, reason: !event ? "event not found" : "rule inactive" });
  }

  const staffIds = await resolveRecipientStaffIds(supabase, rule, event);
  if (staffIds.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: "no recipient resolved" });
  }

  const body = rule.notification_body
    .replaceAll("{event_name}", event.name)
    .replaceAll("{additional_info}", event.menu_notes?.trim() || "ללא מידע נוסף");
  let sent = 0;
  let total = 0;
  for (const staffId of staffIds) {
    const result = await sendPushToStaff(staffId, { title: rule.notification_title, body });
    sent += result.sent;
    total += result.total;
  }

  return Response.json({ ok: true, sent, total });
}
