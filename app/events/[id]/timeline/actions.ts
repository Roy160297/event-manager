"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scheduleSortKey } from "@/lib/labels";
import { addMinutesToTime, timeToMinutes } from "@/lib/scheduleTime";
import { extractTimelineFromImage, type TimelineImportDraft } from "@/lib/timelineImport";
import type { TimelineItemRow } from "@/lib/types";

export async function parseTimelineImage(formData: FormData): Promise<TimelineImportDraft[]> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("הקובץ שנבחר אינו תמונה");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return extractTimelineFromImage(buffer, file.type);
}

export async function addTimelineItemsFromImport(eventId: string, items: TimelineImportDraft[]) {
  const validItems = items.filter((item) => item.label.trim());
  if (validItems.length === 0) throw new Error("אין שלבים תקינים להוספה");

  const supabase = await createClient();
  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = validItems.map((item, index) => ({
    event_id: eventId,
    label: item.label.trim(),
    approx_time: item.approx_time?.trim() || null,
    notes: item.notes?.trim() || null,
    sort_order: (count ?? 0) + index,
  }));

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) throw new Error(error.message);

  for (const item of validItems) {
    if (item.approx_time?.trim()) await schedulePushRemindersForStep(eventId, item.label.trim(), item.approx_time.trim());
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function addTimelineItem(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label || !approxTime) throw new Error("כותרת השלב והשעה הם שדות חובה");

  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("timeline_items").insert({
    event_id: eventId,
    label,
    approx_time: approxTime,
    notes,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);

  await schedulePushRemindersForStep(eventId, label, approxTime);

  revalidatePath(`/events/${eventId}/timeline`);
}

// Shifts the chosen step and every step after it (in displayed/sorted
// order, not insertion order) by the same number of minutes - e.g. running
// 20 minutes late from "חופה" onward without having to retype every
// following step's time by hand.
export async function shiftTimelineFrom(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const fromItemId = String(formData.get("from_item_id") ?? "").trim();
  const minutesRaw = String(formData.get("minutes") ?? "").trim();
  const minutes = Number(minutesRaw);

  if (!fromItemId) throw new Error("יש לבחור שלב התחלה");
  if (!minutesRaw || !Number.isFinite(minutes) || minutes === 0) {
    throw new Error("יש להזין מספר דקות שונה מאפס");
  }

  const { data: rawItems, error: fetchError } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("event_id", eventId)
    .returns<TimelineItemRow[]>();
  if (fetchError) throw new Error(fetchError.message);

  const items = (rawItems ?? []).sort((a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time));
  const fromIndex = items.findIndex((item) => item.id === fromItemId);
  if (fromIndex === -1) throw new Error("השלב שנבחר לא נמצא");

  const toShift = items.slice(fromIndex).filter((item) => item.approx_time);
  const updates = toShift.map((item) => ({
    id: item.id,
    approx_time: addMinutesToTime(item.approx_time!, minutes),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from("timeline_items")
      .update({ approx_time: update.approx_time })
      .eq("id", update.id);
    if (error) throw new Error(error.message);
  }

  // Any shifted step could be the anchor of some active reminder rule -
  // reschedule each one against its new time, same as editing it directly.
  for (const [index, item] of toShift.entries()) {
    const newTime = updates[index].approx_time;
    if (newTime) await schedulePushRemindersForStep(eventId, item.label, newTime);
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("timeline_items").select("label").eq("id", itemId).maybeSingle();

  const { error } = await supabase.from("timeline_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  if (item?.label) await cancelPushRemindersForEvent(eventId, item.label);

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteAllTimelineItems(eventId: string) {
  const supabase = await createClient();
  await cancelPushRemindersForEvent(eventId, null);
  const { error } = await supabase.from("timeline_items").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/timeline`);
}

export async function updateTimelineItem(eventId: string, itemId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label || !approxTime) throw new Error("כותרת השלב והשעה הם שדות חובה");

  const { data: previous } = await supabase.from("timeline_items").select("label").eq("id", itemId).maybeSingle();

  const { error } = await supabase
    .from("timeline_items")
    .update({ label, approx_time: approxTime, notes })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  // Editing an existing step (fixing its time, or relabeling it into/out of
  // matching some rule's anchor) should reschedule/cancel the same way
  // creating the default schedule does - not just insertSchedule's own call.
  if (previous?.label && previous.label !== label) await cancelPushRemindersForEvent(eventId, previous.label);
  await schedulePushRemindersForStep(eventId, label, approxTime);

  revalidatePath(`/events/${eventId}/timeline`);
}

const EVENING_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:30" },
  { label: "מזנונים נסגרים, הכנות לחופה והדרכה", time: "20:45", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "21:00" },
  { label: "מזנונים נפתחים (מנות עיקריות)", time: "21:20", notes: "15-20 דקות ריקודים" },
  { label: "מנות עיקריות", time: "21:50", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "22:20" },
  { label: "קינוחים", time: "22:50", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "23:50", notes: "קיפול הקינוחים" },
];

const EVENING_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:30" },
  { label: "הכנות לחופה והדרכה", time: "20:45", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "21:00" },
  { label: "ראשונות", time: "21:20" },
  { label: "ריקודים", time: "21:35" },
  { label: "עיקריות", time: "22:00", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "22:30" },
  { label: "קינוחים", time: "22:45", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "23:45", notes: "קיפול הקינוחים" },
];

const EVENING_REVERSE_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "פתיחת דלתות ומזנונים ראשיים", time: "19:50" },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:30" },
  { label: "סגירת מזנוני חצר", time: "21:05" },
  {
    label: "סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "21:20",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "21:30" },
  { label: "ריקודים", time: "21:50", notes: "פתיחת מזנון עיקריות מצומצם לכ45 דק' (מתחת לגלריה)" },
  { label: "קינוחים", time: "22:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "23:30", notes: "קיפול הקינוחים" },
];

// Reverse + service combined: the "reverse" timing skeleton (food happens
// before the chuppah, then it's just dancing+dessert after) with the
// "service" seated-course concept instead of buffets - both starters and
// mains are served in the pre-chuppah window, so after the chuppah it's
// straight to dancing and then dessert (no seated course after the chuppah).
const EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "פתיחת דלתות, ראשונות על השולחן", time: "19:50" },
  { label: "הגשת עיקריות", time: "20:20" },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:20" },
  {
    label: "סיום הגשת עיקריות, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "21:15",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "21:30" },
  { label: "ריקודים", time: "21:50", notes: "הכלה מחליפה ללוק שני" },
  { label: "קינוחים", time: "22:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "23:30", notes: "קיפול הקינוחים" },
];

// Every FRIDAY_* schedule below is written assuming קבלת פנים at "12:00" -
// insertFridaySchedule shifts every step by the difference between this and
// the real event's own start_time (so an event starting at 11:30 gets its
// first step, the couple's arrival, at 10:30, קבלת פנים at 11:30, and the
// rest of the schedule following at the same relative offsets), rather than
// assuming every Friday event starts at noon. אפטר is always exactly one
// hour after קינוחים, same rule as the evening schedules.
const FRIDAY_REVERSE_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "11:00" },
  { label: "הבאת אוכל לזוג", time: "11:15", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "12:00" },
  { label: "פתיחת דלתות ומזנונים ראשיים", time: "12:20" },
  { label: "כתובה", time: "13:00", notes: "לוודא הגעת שני עדים עד השעה 13:00" },
  { label: "סגירת מזנוני חצר", time: "13:35" },
  {
    label: "סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "13:50",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "14:00" },
  { label: "ריקודים", time: "14:20", notes: "פתיחת מזנון עיקריות מצומצם לכ45 דק' (מתחת לגלריה)" },
  { label: "קינוחים", time: "15:00", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "16:00", notes: "קיפול הקינוחים" },
];

// Mirrors EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE's structure and offsets
// from קבלת פנים (not this schedule's own pre-restructure times), per the
// 2026-09-22 restructuring. There's no non-reverse Friday schedule (venue
// weddings on Friday are always the reverse format) and no plain FRIDAY_
// version of the buffet/service schedules either, for the same reason.
const FRIDAY_REVERSE_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "11:00" },
  { label: "הבאת אוכל לזוג", time: "11:15", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "12:00" },
  { label: "פתיחת דלתות, ראשונות על השולחן", time: "12:20" },
  { label: "הגשת עיקריות", time: "12:50" },
  { label: "כתובה", time: "13:00", notes: "לוודא הגעת שני עדים עד השעה 12:50" },
  {
    label: "סיום הגשת עיקריות, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "13:45",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "14:00" },
  { label: "ריקודים", time: "14:20", notes: "הכלה מחליפה ללוק שני" },
  { label: "קינוחים", time: "15:00", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "16:00", notes: "קיפול הקינוחים" },
];

async function insertSchedule(
  eventId: string,
  schedule: { label: string; time: string; notes?: string }[],
) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = schedule.map((step, index) => ({
    event_id: eventId,
    label: step.label,
    approx_time: step.time,
    notes: step.notes ?? null,
    sort_order: (count ?? 0) + index,
  }));

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) throw new Error(error.message);

  for (const step of schedule) {
    await schedulePushRemindersForStep(eventId, step.label, step.time);
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

// Schedules (or reschedules) every active push_reminder_rules row anchored
// to this step's label, timed relative to its time - see
// schedule_push_reminders_for_step in the 00000000000058 migration. A no-op
// if no rule is anchored to this label. Best-effort - a failure here (e.g.
// app_settings.push_webhook_secret not configured yet) shouldn't block
// editing the timeline itself.
export async function schedulePushRemindersForStep(eventId: string, label: string, time: string) {
  const supabase = await createClient();
  try {
    await supabase.rpc("schedule_push_reminders_for_step", { p_event_id: eventId, p_label: label, p_time: time });
  } catch (err) {
    console.error(`Failed to schedule push reminders for event ${eventId}, step "${label}":`, err);
  }
}

// Cancels any push reminder(s) anchored to p_label for this event (or every
// push reminder for the event, if p_label is null) - used when a step is
// deleted or the whole timeline is wiped, so a stale job doesn't fire for a
// step that no longer exists.
async function cancelPushRemindersForEvent(eventId: string, label: string | null) {
  const supabase = await createClient();
  try {
    await supabase.rpc("cancel_push_reminders_for_event", { p_event_id: eventId, p_label: label });
  } catch (err) {
    console.error(`Failed to cancel push reminders for event ${eventId}:`, err);
  }
}

export async function addEveningWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_WEDDING_SCHEDULE);
}

export async function addEveningWeddingServiceSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_WEDDING_SERVICE_SCHEDULE);
}

export async function addEveningReverseWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SCHEDULE);
}

export async function addEveningReverseWeddingServiceSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE);
}

// FRIDAY_* templates all assume קבלת פנים at "12:00" - shift every step by
// the real event's own start_time (see the comment above
// FRIDAY_REVERSE_WEDDING_SCHEDULE) before inserting. Falls back to the
// template as-is if the event has no start_time yet.
const FRIDAY_SCHEDULE_TEMPLATE_START_TIME = "12:00";

async function insertFridaySchedule(
  eventId: string,
  template: { label: string; time: string; notes?: string }[],
) {
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("start_time").eq("id", eventId).maybeSingle();

  const startTime = event?.start_time;
  const diffMinutes =
    startTime != null
      ? (timeToMinutes(startTime) ?? 0) - (timeToMinutes(FRIDAY_SCHEDULE_TEMPLATE_START_TIME) ?? 0)
      : 0;

  const schedule =
    diffMinutes === 0
      ? template
      : template.map((step) => ({ ...step, time: addMinutesToTime(step.time, diffMinutes) ?? step.time }));

  await insertSchedule(eventId, schedule);
}

export async function addFridayReverseWeddingSchedule(eventId: string) {
  await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SCHEDULE);
}

export async function addFridayReverseWeddingServiceSchedule(eventId: string) {
  await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SERVICE_SCHEDULE);
}

// Called right after a new event is created, so events of a type with a
// known default schedule start with it pre-filled instead of empty. Other
// event types are left as before, filled in manually on the timeline page.
// "wedding"/"wedding_service" only have one (evening) shape - the venue
// never actually runs those formats on a Friday, only the reverse ones, so
// only reverse_wedding/reverse_wedding_service branch by day-of-week.
export async function applyDefaultSchedule(eventId: string, eventType: string, eventDate?: string | null) {
  const isFriday = isFridayDate(eventDate);
  if (eventType === "wedding") {
    await insertSchedule(eventId, EVENING_WEDDING_SCHEDULE);
  } else if (eventType === "wedding_service") {
    await insertSchedule(eventId, EVENING_WEDDING_SERVICE_SCHEDULE);
  } else if (eventType === "reverse_wedding") {
    if (isFriday) await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SCHEDULE);
    else await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SCHEDULE);
  } else if (eventType === "reverse_wedding_service") {
    if (isFriday) await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SERVICE_SCHEDULE);
    else await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE);
  }
}

// Every distinct step label across the 6 default templates - offered as
// autocomplete suggestions for a push reminder rule's anchor_label (see
// app/push-reminders/page.tsx), since a typo there means the rule silently
// never matches any real timeline step and just never fires.
export async function getKnownTimelineStepLabels(): Promise<string[]> {
  const allSteps = [
    ...EVENING_WEDDING_SCHEDULE,
    ...EVENING_WEDDING_SERVICE_SCHEDULE,
    ...EVENING_REVERSE_WEDDING_SCHEDULE,
    ...EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE,
    ...FRIDAY_REVERSE_WEDDING_SCHEDULE,
    ...FRIDAY_REVERSE_WEDDING_SERVICE_SCHEDULE,
  ];
  return [...new Set(allSteps.map((step) => step.label))].sort((a, b) => a.localeCompare(b, "he"));
}

function isFridayDate(eventDate?: string | null): boolean {
  if (!eventDate) return false;
  const [year, month, day] = eventDate.split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}
