import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
import {
  emailRuleRecipients,
  isEmailRuleConditionMet,
  loadActiveEmailReminderRules,
  renderEmailBody,
  renderEmailSubject,
  resolveEmailTargetDate,
} from "@/lib/emailReminders";
import type { EmailReminderRuleRow, EventRow } from "@/lib/types";

type ReminderableEvent = Pick<
  EventRow,
  | "id"
  | "name"
  | "event_type"
  | "event_date"
  | "couple_meeting_date"
  | "estimated_guests"
  | "kids_meal_count"
  | "glat_meal_count"
  | "vegetarian_meal_count"
  | "vegan_meal_count"
  | "gluten_free_meal_count"
  | "toddlers_under_2_count"
  | "menu_notes"
>;

// Shared by the daily cron route (app/api/cron/couple-meeting-reminders) and
// the "check right now" call after creating/saving an event - same
// claim-then-send logic either way, just fed one event at a time here so the
// cron can still do its own single bulk query instead of N+1ing this.
// The rules come from the email_reminder_rules table; the cron loads them once
// and passes them in, otherwise they're loaded here.
export async function sendDueReminders(
  supabase: ReturnType<typeof createAdminClient>,
  event: ReminderableEvent,
  managerEmail: string | null | undefined,
  // Which daily cron pass is calling this (see vercel.json - morning and
  // evening passes). The immediate post-save check has no real "pass" of its
  // own, so it's treated as the morning one - see the run_window rule field.
  pass: "morning" | "evening" = "morning",
  salespersonEmail?: string | null,
  rules?: EmailReminderRuleRow[],
): Promise<{ sent: number; skippedAlreadySent: number }> {
  // Business events don't have a couple/wedding flow, so none of these
  // couple-meeting-anchored reminder rules are relevant to them.
  if (event.event_type === "business_event") return { sent: 0, skippedAlreadySent: 0 };

  const activeRules = rules ?? (await loadActiveEmailReminderRules(supabase));
  const today = todayInIsrael();
  let sent = 0;
  let skippedAlreadySent = 0;

  for (const rule of activeRules) {
    if (rule.run_window && rule.run_window !== pass) continue;

    const targetDate = resolveEmailTargetDate(rule, event);
    if (!targetDate) continue;

    // "exact" fires only on the single day today === target - if that day has
    // already passed (e.g. the event was created/edited with fewer days left
    // than the offset), it's missed for good. "on_or_after" fires the first
    // day today is on or past the target, and at most once ever for that
    // event - catches events entering the window "already late".
    const isDue = rule.match_mode === "on_or_after" ? today >= targetDate : today === targetDate;
    if (!isDue) continue;

    // on_or_after has no upper bound on its own - without this, a rule that
    // never fired for some old event would "catch up" and send today even
    // though the event itself is long over.
    if (rule.match_mode === "on_or_after" && event.event_date < today) continue;

    if (!(await isEmailRuleConditionMet(rule, event, supabase))) continue;

    const recipients = emailRuleRecipients(rule, managerEmail, salespersonEmail);
    if (recipients.length === 0) continue;
    const to = recipients.join(", ");

    // on_or_after rules fire at most once ever per event - checked separately
    // since the reminder_log unique constraint below only catches same-day
    // duplicates, not "already sent on some earlier day."
    if (rule.match_mode === "on_or_after") {
      const { count } = await supabase
        .from("reminder_log")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("rule_key", rule.rule_key);
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
      .insert({ event_id: event.id, rule_key: rule.rule_key, sent_date: today });

    if (claimError) {
      if (claimError.code === "23505") skippedAlreadySent++;
      continue;
    }

    try {
      await sendReminderEmail({
        to,
        subject: renderEmailSubject(rule.subject, event),
        bodyText: renderEmailBody(rule.body, event),
      });
      sent++;
    } catch (err) {
      // The claim above already marked this (event, rule, day) as sent - undo
      // it so a transient failure (bad credentials, Gmail hiccup) gets
      // retried on the next pass instead of being silently lost forever.
      // Logged (not swallowed) so it's visible in Vercel's function logs.
      await supabase.from("reminder_log").delete().eq("event_id", event.id).eq("rule_key", rule.rule_key).eq("sent_date", today);
      console.error(`Failed to send reminder "${rule.rule_key}" for event ${event.id}:`, err);
    }
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
      .select("*, staff!manager_id(email), sales:staff!sales_person_id(email)")
      .eq("id", eventId)
      .is("deleted_at", null)
      .returns<(EventRow & { staff: { email: string | null } | null; sales: { email: string | null } | null })[]>()
      .maybeSingle();

    if (!event) return;
    await sendDueReminders(supabase, event, event.staff?.email, "morning", event.sales?.email);
  } catch (err) {
    // Swallow - see comment above - but still log so a broken admin client
    // (e.g. missing SUPABASE_SERVICE_ROLE_KEY) doesn't fail invisibly.
    console.error(`checkRemindersForEvent failed for event ${eventId}:`, err);
  }
}
