"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LocationType } from "@/lib/types";

export async function createLocation(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const locationType = String(formData.get("location_type") ?? "table") as LocationType;
  const label = String(formData.get("label") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0) || 0;

  if (!label) throw new Error("שם השולחן/העמדה הוא שדה חובה");

  const { error } = await supabase
    .from("private_event_locations")
    .insert({ event_id: eventId, location_type: locationType, label, capacity });

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/staffing`);
}

export async function updateLocation(eventId: string, locationId: string, formData: FormData) {
  const supabase = await createClient();

  const locationType = String(formData.get("location_type") ?? "table") as LocationType;
  const label = String(formData.get("label") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0) || 0;

  if (!label) throw new Error("שם השולחן/העמדה הוא שדה חובה");

  const { error } = await supabase
    .from("private_event_locations")
    .update({ location_type: locationType, label, capacity })
    .eq("id", locationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/staffing`);
}

export async function deleteLocation(eventId: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_locations").delete().eq("id", locationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/staffing`);
}

const TABLE_SKETCH_BUCKET = "private-event-sketches";

export async function uploadTableSketch(eventId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ");

  const supabase = await createClient();

  const { data: event } = await supabase.from("private_events").select("table_sketch_path").eq("id", eventId).single();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${eventId}/sketch-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(TABLE_SKETCH_BUCKET)
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("private_events").update({ table_sketch_path: path }).eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from(TABLE_SKETCH_BUCKET).remove([event.table_sketch_path]);
  }

  revalidatePath(`/private-events/${eventId}/staffing`);
}

export async function removeTableSketch(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase.from("private_events").select("table_sketch_path").eq("id", eventId).single();

  const { error } = await supabase.from("private_events").update({ table_sketch_path: null }).eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from(TABLE_SKETCH_BUCKET).remove([event.table_sketch_path]);
  }

  revalidatePath(`/private-events/${eventId}/staffing`);
}

export async function updateSeatedChairsCount(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const count = String(formData.get("sketch_seated_chairs_count") ?? "").trim() || null;

  const { error } = await supabase.from("private_events").update({ sketch_seated_chairs_count: count }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/staffing`);
}
