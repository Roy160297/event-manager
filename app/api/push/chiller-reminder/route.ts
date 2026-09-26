import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToStaff } from "@/lib/pushNotifications";

// Called by a one-time pg_cron + pg_net job that schedule_chiller_reminder()
// (see the 00000000000056 migration) schedules for a specific event, exactly
// 20 minutes before that event's own chuppah time - see
// app/events/[id]/timeline/actions.ts for where that job gets scheduled.
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { eventId } = await request.json();
  if (!eventId || typeof eventId !== "string") {
    return Response.json({ error: "Missing eventId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("name, manager_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event?.manager_id) {
    return Response.json({ ok: true, sent: 0, reason: "no manager assigned" });
  }

  const result = await sendPushToStaff(event.manager_id, {
    title: "תזכורת: העלאת צ'ילר לחופה",
    body: `האירוע של ${event.name} - 20 דקות לפני החופה, יש להעלות צ'ילר לחופה.`,
  });

  return Response.json({ ok: true, ...result });
}
