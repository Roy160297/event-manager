import { createAdminClient } from "@/lib/supabase/admin";
import { sendDueReminders } from "@/lib/reminderRunner";
import type { EventRow, StaffRow } from "@/lib/types";

type EventWithManager = EventRow & { staff: Pick<StaffRow, "email"> | null };

// Triggered twice daily by Vercel Cron (see vercel.json) - a morning pass and
// an evening pass, distinguished by a "?pass=evening" query param on the
// evening entry (morning is the default, matching sendDueReminders' default).
// Runs with no logged-in user/session, so it needs the service-role admin
// client (RLS has nothing to authenticate against here) rather than the
// normal cookie-based one. This is the backstop for reminders:
// creating/saving an event also checks immediately (see
// lib/reminderRunner.ts's checkRemindersForEvent), but this daily sweep still
// catches the "day before"/"week before" rules that anchor on event_date and
// become due long after the event was created.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const pass = new URL(request.url).searchParams.get("pass") === "evening" ? "evening" : "morning";

  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*, staff!manager_id(email)")
      .is("deleted_at", null)
      .returns<EventWithManager[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    let sent = 0;
    let skippedAlreadySent = 0;

    for (const event of events ?? []) {
      const result = await sendDueReminders(supabase, event, event.staff?.email, pass);
      sent += result.sent;
      skippedAlreadySent += result.skippedAlreadySent;
    }

    return Response.json({ ok: true, sent, skippedAlreadySent });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "שגיאה לא צפויה" }, { status: 500 });
  }
}
