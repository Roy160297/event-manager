"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
