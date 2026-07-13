"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTimelineItem(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label) throw new Error("כותרת שלב ציר הזמן היא שדה חובה");

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

export async function moveTimelineItem(
  eventId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("timeline_items")
    .select("id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (!items) return;

  const index = items.findIndex((item) => item.id === itemId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= items.length) return;

  const current = items[index];
  const target = items[targetIndex];

  await Promise.all([
    supabase.from("timeline_items").update({ sort_order: target.sort_order }).eq("id", current.id),
    supabase.from("timeline_items").update({ sort_order: current.sort_order }).eq("id", target.id),
  ]);

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/timeline`);
}
