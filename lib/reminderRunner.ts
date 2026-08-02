import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { COUPLE_MEETING_REMINDER_RULES, addDaysToDate, todayInIsrael } from "@/lib/coupleMeetingReminders";
import type { EventRow } from "@/lib/types";

type ReminderableEvent = Pick<EventRow, "id" | "name" | "event_type" | "event_date" | "couple_meeting_date">;

// Shared by the daily cron route (app/api/cron/couple-meeting-reminders) and
// the "check right now" call after creating/saving an event - same
// claim-then-send logic either way, just fed one event at a time here so the
// cron can still do its own single bulk query instead of N+1ing this.
export async function sendDueReminders(
  supabase: ReturnType<typeof createAdminClient>,
  event: ReminderableEvent,
  managerEmail: string | null | undefined,
): Promise<{ sent: number; skippedAlreadySent: number }> {
  if (!managerEmail) return { sent: 0, skippedAlreadySent: 0 };
  // Business events don't have a couple/wedding flow, so none of these
  // couple-meeting-anchored reminder rules are relevant to them.
  if (event.event_type === "business_event") return { sent: 0, skippedAlreadySent: 0 };

  const today = todayInIsrael();
  let sent = 0;
  let skippedAlreadySent = 0;

  for (const rule of COUPLE_MEETING_REMINDER_RULES) {
    const anchorDate = rule.anchor === "couple_meeting_date" ? event.couple_meeting_date : event.event_date;
    if (!anchorDate) continue;

    const targetDate = addDaysToDate(anchorDate, rule.offsetDays);
    const isDue = rule.matchMode === "onOrAfter" ? today >= targetDate : today === targetDate;
    if (!isDue) continue;

    // "onOrAfter" rules (e.g. an event created/edited with fewer days left
    // than the offset, so the exact target day already passed) fire at most
    // once ever per event - checked separately since the reminder_log unique
    // constraint below only catches same-day duplicates, not "already sent
    // on some earlier day."
    if (rule.matchMode === "onOrAfter") {
      const { count } = await supabase
        .from("reminder_log")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("rule_key", rule.key);
      if ((count ?? 0) > 0) {
        skippedAlreadySent++;
        continue;
      }
    }

    // Claim this (event, rule, day) before sending - the unique constraint on
    // reminder_log makes this atomic, so a same-day cron run and an
    // immediate post-save check can't double-send even if they race.
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

  return { sent, skippedAlreadySent };
}

// Called right after creating or saving an event, so a reminder due "today"
// goes out immediately instead of waiting for tomorrow's cron tick (which
// would miss it entirely, since each rule only matches on one specific day).
// Best-effort: never throws, since a reminder failing shouldn't block a save
// and the daily cron is still there as a backstop for the "day before" and
// "week before" rules that anchor on event_date, not creation time.
export async function checkRemindersForEvent(eventId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from("events")
      .select("*, staff!manager_id(email)")
      .eq("id", eventId)
      .is("deleted_at", null)
      .returns<(EventRow & { staff: { email: string | null } | null })[]>()
      .maybeSingle();

    if (!event) return;
    await sendDueReminders(supabase, event, event.staff?.email);
  } catch {
    // Swallow - see comment above.
  }
}
