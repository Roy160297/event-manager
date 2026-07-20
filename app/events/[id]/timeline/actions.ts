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

const DEFAULT_SCHEDULE: { label: string; time: string; notes?: string }[] = [
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
  { label: "קינוחים", time: "22:45", notes: "קיפול המזנונים" },
  { label: "אפטר", time: "00:00", notes: "קיפול הקינוחים" },
];

export async function addDefaultSchedule(eventId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = DEFAULT_SCHEDULE.map((step, index) => ({
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
