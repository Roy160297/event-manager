import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToStaff } from "@/lib/pushNotifications";

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
    supabase.from("events").select("name, manager_id").eq("id", eventId).is("deleted_at", null).maybeSingle(),
    supabase
      .from("push_reminder_rules")
      .select("notification_title, notification_body, active")
      .eq("id", ruleId)
      .maybeSingle(),
  ]);

  if (!event?.manager_id || !rule?.active) {
    return Response.json({ ok: true, sent: 0, reason: !event?.manager_id ? "no manager assigned" : "rule inactive" });
  }

  const result = await sendPushToStaff(event.manager_id, {
    title: rule.notification_title,
    body: rule.notification_body.replaceAll("{event_name}", event.name),
  });

  return Response.json({ ok: true, ...result });
}
