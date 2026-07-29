import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { COUPLE_MEETING_REMINDER_RULES, addDaysToDate, todayInIsrael } from "@/lib/coupleMeetingReminders";
import type { EventRow, StaffRow } from "@/lib/types";

type EventWithManager = EventRow & { staff: Pick<StaffRow, "email"> | null };

// Triggered daily by Vercel Cron (see vercel.json) - runs with no logged-in
// user/session, so it needs the service-role admin client (RLS has nothing
// to authenticate against here) rather than the normal cookie-based one.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

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

    const today = todayInIsrael();
    let sent = 0;
    let skippedAlreadySent = 0;

    for (const event of events ?? []) {
      const managerEmail = event.staff?.email;
      if (!managerEmail) continue;

      for (const rule of COUPLE_MEETING_REMINDER_RULES) {
        const anchorDate = rule.anchor === "couple_meeting_date" ? event.couple_meeting_date : event.event_date;
        if (!anchorDate) continue;
        if (addDaysToDate(anchorDate, rule.offsetDays) !== today) continue;

        // Claim this (event, rule, day) before sending - the unique
        // constraint on reminder_log makes this atomic, so a second trigger
        // the same day (manual check + schedule, a retry, etc) can't
        // double-send even if it races this one.
        const { error: claimError } = await supabase
          .from("reminder_log")
          .insert({ event_id: event.id, rule_key: rule.key, sent_date: today });

        if (claimError) {
          if (claimError.code === "23505") skippedAlreadySent++;
          continue;
        }

        await sendReminderEmail({
          to: managerEmail,
          subject: rule.subject,
          bodyText: rule.body(event.name, event.event_date),
        });
        sent++;
      }
    }

    return Response.json({ ok: true, sent, skippedAlreadySent });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "שגיאה לא צפויה" }, { status: 500 });
  }
}
