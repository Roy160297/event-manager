"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdfImport";
import { parseTableSketchDraft } from "@/lib/tableSketchImport";
import type { LocationType, WaiterRole } from "@/lib/types";

export async function createLocation(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const locationType = String(formData.get("location_type") ?? "table") as LocationType;
  const label = String(formData.get("label") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0) || 0;

  if (!label) throw new Error("שם השולחן/העמדה הוא שדה חובה");

  const { error } = await supabase
    .from("locations")
    .insert({ event_id: eventId, location_type: locationType, label, capacity });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

// Inserts new tables/food stands from a parsed sketch, skipping any
// label+type already present so re-uploading the same (or a corrected)
// sketch never creates duplicates. Returns how many were actually added.
async function createLocationsFromSketch(
  eventId: string,
  draft: { tables: { label: string; capacity: number }[]; foodStands: { label: string }[] },
): Promise<number> {
  const supabase = await createClient();

  const { data: existingLocations } = await supabase
    .from("locations")
    .select("label, location_type")
    .eq("event_id", eventId);

  const existingKeys = new Set(
    (existingLocations ?? []).map((loc) => `${loc.location_type}:${loc.label}`),
  );

  const toInsert = [
    ...draft.tables
      .filter((t) => t.label.trim() && !existingKeys.has(`table:${t.label.trim()}`))
      .map((t) => ({
        event_id: eventId,
        location_type: "table" as const,
        label: t.label.trim(),
        capacity: t.capacity,
      })),
    ...draft.foodStands
      .filter((f) => f.label.trim() && !existingKeys.has(`food_stand:${f.label.trim()}`))
      .map((f) => ({
        event_id: eventId,
        location_type: "food_stand" as const,
        label: f.label.trim(),
        capacity: 0,
      })),
  ];

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from("locations").insert(toInsert);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
  return toInsert.length;
}

const TABLE_SKETCH_BUCKET = "event-sketches";

export async function uploadTableSketch(eventId: string, formData: FormData): Promise<{ locationsAdded: number }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("table_sketch_path")
    .eq("id", eventId)
    .single();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${eventId}/sketch-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(TABLE_SKETCH_BUCKET)
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  // Auto-fill the seated-chairs count AND import the sketch's tables/food
  // stands into `locations` - both only possible for iPlan PDF exports
  // (image sketches have no extractable text). This is what used to be a
  // separate "ייבוא סקיצת שולחנות" wizard the manager had to run as its own
  // step after uploading; per venue request, uploading the sketch is now the
  // one action that does both. Left untouched if parsing fails or finds no
  // tables, so a manager can still fill in the chair count and add locations
  // by hand either way.
  let seatedChairsCount: string | null = null;
  let locationsAdded = 0;
  if (ext === "pdf") {
    try {
      const draft = parseTableSketchDraft(await extractPdfText(buffer));
      if (draft.tables.length > 0) {
        seatedChairsCount = String(draft.tables.reduce((sum, t) => sum + t.seated, 0));
      }
      locationsAdded = await createLocationsFromSketch(eventId, draft);
    } catch {
      // Ignore - falls back to manual entry.
    }
  }

  const { error } = await supabase
    .from("events")
    .update({
      table_sketch_path: path,
      ...(seatedChairsCount !== null ? { sketch_seated_chairs_count: seatedChairsCount } : {}),
    })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from(TABLE_SKETCH_BUCKET).remove([event.table_sketch_path]);
  }

  revalidatePath(`/events/${eventId}/staffing`);
  return { locationsAdded };
}

export async function removeTableSketch(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("table_sketch_path")
    .eq("id", eventId)
    .single();

  const { error } = await supabase.from("events").update({ table_sketch_path: null }).eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from(TABLE_SKETCH_BUCKET).remove([event.table_sketch_path]);
  }

  revalidatePath(`/events/${eventId}/staffing`);
}

export async function updateSeatedChairsCount(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const count = String(formData.get("sketch_seated_chairs_count") ?? "").trim() || null;

  const { error } = await supabase.from("events").update({ sketch_seated_chairs_count: count }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function deleteLocation(eventId: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function updateLocation(eventId: string, locationId: string, formData: FormData) {
  const supabase = await createClient();

  const locationType = String(formData.get("location_type") ?? "table") as LocationType;
  const label = String(formData.get("label") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0) || 0;

  if (!label) throw new Error("שם השולחן/העמדה הוא שדה חובה");

  const { error } = await supabase
    .from("locations")
    .update({ location_type: locationType, label, capacity })
    .eq("id", locationId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function assignWaiter(eventId: string, locationId: string, waiterId: string, role: WaiterRole) {
  if (!waiterId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("waiter_assignments")
    .insert({ event_id: eventId, location_id: locationId, waiter_id: waiterId, role });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function unassignWaiter(eventId: string, assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiter_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}
