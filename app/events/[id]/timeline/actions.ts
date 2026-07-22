"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteAllTimelineItems(eventId: string) {
  const supabase = await createClient();
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

  const { error } = await supabase
    .from("timeline_items")
    .update({ label, approx_time: approxTime, notes })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/timeline`);
}

const EVENING_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "כתובה", time: "20:00", notes: "לוודא הגעת שני עדים עד השעה 20:00" },
  { label: "מזנונים נסגרים", time: "20:40" },
  { label: "הכנות לחופה והדרכה", time: "20:45", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "21:00" },
  { label: "מזנונים נפתחים (מנות עיקריות)", time: "21:15", notes: "15-20 דקות ריקודים" },
  { label: "מנות עיקריות", time: "21:45", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "22:15" },
  { label: "קינוחים", time: "22:45", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "00:00", notes: "קיפול הקינוחים" },
];

const EVENING_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "כתובה", time: "20:00", notes: "לוודא הגעת שני עדים עד השעה 20:00" },
  { label: "הכנות לחופה והדרכה", time: "20:45", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "21:00" },
  { label: "ראשונות", time: "21:15", notes: "30 דק' של אוכל (הריקודים מתחילים תוך כדי)" },
  { label: "ריקודים", time: "21:35" },
  { label: "עיקריות", time: "22:00", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "22:30" },
  { label: "קינוחים", time: "22:45", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "00:00", notes: "קיפול הקינוחים" },
];

const EVENING_REVERSE_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  { label: "פתיחת דלתות ומזנונים ראשיים", time: "19:50" },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:30" },
  { label: "סגירת מזנוני חצר", time: "21:00" },
  {
    label: "סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "21:15",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "21:30" },
  { label: "ריקודים", time: "21:45" },
  { label: "קינוחים", time: "22:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "00:00", notes: "קיפול הקינוחים" },
];

// Reverse + service combined: the "reverse" timing skeleton (food happens
// before the chuppah, then it's just dancing+dessert after) with the
// "service" seated-course concept instead of buffets - starters served in
// the pre-chuppah window, mains served after (no reopening for a second
// course, mirroring the reverse-buffet version).
const EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "18:30" },
  { label: "הבאת אוכל לזוג", time: "18:45", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "19:30" },
  {
    label: "פתיחת דלתות והגשת ראשונות",
    time: "19:50",
    notes: "30 דק' של אוכל (הריקודים מתחילים תוך כדי)",
  },
  { label: "כתובה", time: "20:30", notes: "לוודא הגעת שני עדים עד השעה 20:30" },
  {
    label: "סיום הגשת ראשונות, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "21:15",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "21:30" },
  { label: "ריקודים", time: "21:45" },
  { label: "עיקריות", time: "22:00", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "22:30" },
  { label: "קינוחים", time: "22:45", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "00:00", notes: "קיפול הקינוחים" },
];

// Same schedule as EVENING_REVERSE_WEDDING_SCHEDULE, shifted earlier so
// reception starts at 12:00 instead of 19:30 (Friday afternoon events end
// well before evening). Desserts/after don't follow the same fixed offset as
// the rest of the steps - corrected per venue's actual timing.
const FRIDAY_REVERSE_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "11:00" },
  { label: "הבאת אוכל לזוג", time: "11:15", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "12:00" },
  { label: "פתיחת דלתות ומזנונים ראשיים", time: "12:20" },
  { label: "כתובה", time: "13:00", notes: "לוודא הגעת שני עדים עד השעה 13:00" },
  { label: "סגירת מזנוני חצר", time: "13:30" },
  {
    label: "סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה",
    time: "13:45",
    notes: "יצירת שביל חופה",
  },
  { label: "חופה", time: "14:00" },
  { label: "ריקודים", time: "14:15" },
  { label: "קינוחים", time: "15:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "17:00", notes: "קיפול הקינוחים" },
];

// Same schedule as EVENING_WEDDING_SCHEDULE, shifted so reception starts at
// 12:00 instead of 19:30 (Friday afternoon events end well before evening).
// Desserts/after don't follow the same fixed offset as the rest of the
// steps - corrected per venue's actual timing (same pattern as the reverse
// Friday schedule).
const FRIDAY_WEDDING_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "11:00" },
  { label: "הבאת אוכל לזוג", time: "11:15", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "12:00" },
  { label: "כתובה", time: "12:30", notes: "לוודא הגעת שני עדים עד השעה 12:30" },
  { label: "מזנונים נסגרים", time: "13:10" },
  { label: "הכנות לחופה והדרכה", time: "13:15", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "13:30" },
  { label: "מזנונים נפתחים (מנות עיקריות)", time: "13:45", notes: "15-20 דקות ריקודים" },
  { label: "מנות עיקריות", time: "14:15", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "14:45" },
  { label: "קינוחים", time: "15:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "17:00", notes: "קיפול הקינוחים" },
];

// Same schedule as EVENING_WEDDING_SERVICE_SCHEDULE, shifted the same way as
// FRIDAY_WEDDING_SCHEDULE.
const FRIDAY_WEDDING_SERVICE_SCHEDULE: { label: string; time: string; notes?: string }[] = [
  { label: "החתן והכלה מגיעים לאולם", time: "11:00" },
  { label: "הבאת אוכל לזוג", time: "11:15", notes: "אחריות מלצרית משפחה" },
  { label: "קבלת פנים", time: "12:00" },
  { label: "כתובה", time: "12:30", notes: "לוודא הגעת שני עדים עד השעה 12:30" },
  { label: "הכנות לחופה והדרכה", time: "13:15", notes: "יצירת שביל חופה" },
  { label: "חופה", time: "13:30" },
  { label: "ראשונות", time: "13:45", notes: "30 דק' של אוכל (הריקודים מתחילים תוך כדי)" },
  { label: "ריקודים", time: "14:05" },
  { label: "עיקריות", time: "14:30", notes: "הכלה מחליפה ללוק שני" },
  { label: "ריקודים", time: "15:00" },
  { label: "קינוחים", time: "15:30", notes: "קיפול מזנונים" },
  { label: "אפטר", time: "17:00", notes: "קיפול הקינוחים" },
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
  revalidatePath(`/events/${eventId}/timeline`);
}

export async function addEveningWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_WEDDING_SCHEDULE);
}

export async function addEveningWeddingServiceSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_WEDDING_SERVICE_SCHEDULE);
}

export async function addFridayReverseWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, FRIDAY_REVERSE_WEDDING_SCHEDULE);
}

export async function addEveningReverseWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SCHEDULE);
}

export async function addEveningReverseWeddingServiceSchedule(eventId: string) {
  await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE);
}

export async function addFridayWeddingSchedule(eventId: string) {
  await insertSchedule(eventId, FRIDAY_WEDDING_SCHEDULE);
}

export async function addFridayWeddingServiceSchedule(eventId: string) {
  await insertSchedule(eventId, FRIDAY_WEDDING_SERVICE_SCHEDULE);
}

// Called right after a new event is created, so events of a type with a
// known default schedule start with it pre-filled instead of empty. Other
// event types are left as before, filled in manually on the timeline page.
// wedding/wedding_service/reverse_wedding each have two variants (evening
// vs. Friday afternoon) - picked by whether the event date falls on a
// Friday, since that's what distinguishes them in practice (Friday events
// end well before evening/Shabbat).
export async function applyDefaultSchedule(eventId: string, eventType: string, eventDate?: string | null) {
  const isFriday = isFridayDate(eventDate);
  if (eventType === "wedding") {
    await insertSchedule(eventId, isFriday ? FRIDAY_WEDDING_SCHEDULE : EVENING_WEDDING_SCHEDULE);
  } else if (eventType === "wedding_service") {
    await insertSchedule(eventId, isFriday ? FRIDAY_WEDDING_SERVICE_SCHEDULE : EVENING_WEDDING_SERVICE_SCHEDULE);
  } else if (eventType === "reverse_wedding") {
    await insertSchedule(eventId, isFriday ? FRIDAY_REVERSE_WEDDING_SCHEDULE : EVENING_REVERSE_WEDDING_SCHEDULE);
  } else if (eventType === "reverse_wedding_service") {
    await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE);
  }
}

function isFridayDate(eventDate?: string | null): boolean {
  if (!eventDate) return false;
  const [year, month, day] = eventDate.split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}
