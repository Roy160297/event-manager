"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addMinutesToTime, isFriday, timeToMinutes } from "@/lib/scheduleTime";
import type { PrivateEventType } from "@/lib/types";

// Same default run-of-show templates as the venue's own timeline (see
// app/events/[id]/timeline/actions.ts) - copied rather than imported since
// this section has no push-reminder wiring to thread through insertSchedule,
// and no reason to couple its data to the venue module's internals.
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

async function insertSchedule(eventId: string, schedule: { label: string; time: string; notes?: string }[]) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("private_event_timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = schedule.map((step, index) => ({
    event_id: eventId,
    label: step.label,
    approx_time: step.time,
    notes: step.notes ?? null,
    sort_order: (count ?? 0) + index,
  }));

  const { error } = await supabase.from("private_event_timeline_items").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/timeline`);
}

const FRIDAY_SCHEDULE_TEMPLATE_START_TIME = "12:00";

async function insertFridaySchedule(eventId: string, template: { label: string; time: string; notes?: string }[], startTime?: string | null) {
  const diffMinutes =
    startTime != null ? (timeToMinutes(startTime) ?? 0) - (timeToMinutes(FRIDAY_SCHEDULE_TEMPLATE_START_TIME) ?? 0) : 0;

  const schedule =
    diffMinutes === 0 ? template : template.map((step) => ({ ...step, time: addMinutesToTime(step.time, diffMinutes) ?? step.time }));

  await insertSchedule(eventId, schedule);
}

// Called right after a new private event is created, same as the venue's own
// applyDefaultSchedule - fills in a starting run-of-show matching the chosen
// event type instead of leaving the timeline empty.
export async function applyDefaultSchedule(eventId: string, eventType: PrivateEventType, eventDate?: string | null, startTime?: string | null) {
  const friday = isFriday(eventDate ?? null);
  if (eventType === "wedding") {
    await insertSchedule(eventId, EVENING_WEDDING_SCHEDULE);
  } else if (eventType === "wedding_service") {
    await insertSchedule(eventId, EVENING_WEDDING_SERVICE_SCHEDULE);
  } else if (eventType === "reverse_wedding") {
    if (friday) await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SCHEDULE, startTime);
    else await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SCHEDULE);
  } else if (eventType === "reverse_wedding_service") {
    if (friday) await insertFridaySchedule(eventId, FRIDAY_REVERSE_WEDDING_SERVICE_SCHEDULE, startTime);
    else await insertSchedule(eventId, EVENING_REVERSE_WEDDING_SERVICE_SCHEDULE);
  }
}

export async function addTimelineItem(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label) throw new Error("שם השלב הוא שדה חובה");

  const { count } = await supabase
    .from("private_event_timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase
    .from("private_event_timeline_items")
    .insert({ event_id: eventId, label, approx_time: approxTime, notes, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/timeline`);
}

export async function updateTimelineItem(eventId: string, itemId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label) throw new Error("שם השלב הוא שדה חובה");

  const { error } = await supabase
    .from("private_event_timeline_items")
    .update({ label, approx_time: approxTime, notes })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/timeline`);
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_timeline_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/timeline`);
}

export async function deleteAllTimelineItems(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_timeline_items").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/timeline`);
}

// Shifts every step from a chosen one onward by N minutes (positive = later,
// negative = earlier) - same bulk-nudge tool as the venue timeline, minus
// any push-reminder rescheduling (this section has no push-reminder system).
export async function shiftTimelineFrom(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const fromItemId = String(formData.get("from_item_id") ?? "");
  const minutes = Number(formData.get("minutes"));
  if (!fromItemId || !Number.isFinite(minutes) || minutes === 0) {
    throw new Error("יש לבחור שלב התחלה ומספר דקות תקין");
  }

  const { data: items, error: fetchError } = await supabase
    .from("private_event_timeline_items")
    .select("id, sort_order, approx_time")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (fetchError) throw new Error(fetchError.message);

  const fromItem = items?.find((item) => item.id === fromItemId);
  if (!fromItem) throw new Error("השלב שנבחר לא נמצא");

  const toShift = (items ?? []).filter((item) => item.sort_order >= fromItem.sort_order && item.approx_time);

  for (const item of toShift) {
    const [h, m] = item.approx_time!.split(":").map(Number);
    const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
    const newTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    const { error } = await supabase.from("private_event_timeline_items").update({ approx_time: newTime }).eq("id", item.id);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/private-events/${eventId}/timeline`);
}
