import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToStaff } from "@/lib/pushNotifications";
import type { PushReminderRuleRow } from "@/lib/types";

type RuleForRecipients = Pick<
  PushReminderRuleRow,
  "recipient_type" | "recipient_role_id" | "recipient_staff_id"
>;
type EventForRecipients = { manager_id: string | null; floor_manager_id: string | null };

// A rule's recipient isn't always the event's manager - e.g. a bar-related
// reminder should go to whoever's in the bar role, not the office. "role"
// can resolve to several staff members at once (everyone currently holding
// that role), so this always returns a list.
async function resolveRecipientStaffIds(
  supabase: SupabaseClient,
  rule: RuleForRecipients,
  event: EventForRecipients,
): Promise<string[]> {
  switch (rule.recipient_type) {
    case "event_manager":
      return event.manager_id ? [event.manager_id] : [];
    case "floor_manager":
      return event.floor_manager_id ? [event.floor_manager_id] : [];
    case "fixed_staff":
      return rule.recipient_staff_id ? [rule.recipient_staff_id] : [];
    case "role": {
      if (!rule.recipient_role_id) return [];
      const { data } = await supabase.from("staff").select("id").eq("role_id", rule.recipient_role_id);
      return (data ?? []).map((row: { id: string }) => row.id);
    }
  }
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
      .select("name, manager_id, floor_manager_id")
      .eq("id", eventId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("push_reminder_rules")
      .select("notification_title, notification_body, active, recipient_type, recipient_role_id, recipient_staff_id")
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

  const body = rule.notification_body.replaceAll("{event_name}", event.name);
  let sent = 0;
  let total = 0;
  for (const staffId of staffIds) {
    const result = await sendPushToStaff(staffId, { title: rule.notification_title, body });
    sent += result.sent;
    total += result.total;
  }

  return Response.json({ ok: true, sent, total });
}
