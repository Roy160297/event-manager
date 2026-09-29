"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdfImport";
import { parseTableSketchDraft } from "@/lib/tableSketchImport";
import type { LocationType, WaiterRole, WaiterSkill } from "@/lib/types";

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

// Syncs tables/food stands from a parsed sketch against what the event
// already has: adds anything new, updates a table's capacity if the sketch's
// number changed, and removes anything no longer in the sketch - but only if
// nothing is staffed there yet. A location with a waiter already assigned is
// left alone even if it's missing from the new sketch, since deleting it
// would cascade-delete that assignment (locations -> waiter_assignments is
// on delete cascade) and silently lose real scheduling work over what might
// just be a sketch mistake. Matches by label+type, since that's the only
// stable identifier a re-exported sketch gives us.
async function syncLocationsFromSketch(
  eventId: string,
  draft: { tables: { label: string; capacity: number }[]; foodStands: { label: string }[] },
): Promise<{ added: number; updated: number; removed: number }> {
  const supabase = await createClient();

  const [{ data: existingLocations }, { data: assignments }] = await Promise.all([
    supabase.from("locations").select("id, label, location_type, capacity").eq("event_id", eventId),
    supabase.from("waiter_assignments").select("location_id").eq("event_id", eventId),
  ]);

  const assignedLocationIds = new Set((assignments ?? []).map((a) => a.location_id));
  const existingByKey = new Map((existingLocations ?? []).map((loc) => [`${loc.location_type}:${loc.label}`, loc]));

  const draftEntries: { location_type: "table" | "food_stand"; label: string; capacity: number }[] = [
    ...draft.tables.filter((t) => t.label.trim()).map((t) => ({ location_type: "table" as const, label: t.label.trim(), capacity: t.capacity })),
    ...draft.foodStands.filter((f) => f.label.trim()).map((f) => ({ location_type: "food_stand" as const, label: f.label.trim(), capacity: 0 })),
  ];
  const draftKeys = new Set(draftEntries.map((e) => `${e.location_type}:${e.label}`));

  const toInsert = draftEntries
    .filter((e) => !existingByKey.has(`${e.location_type}:${e.label}`))
    .map((e) => ({ event_id: eventId, location_type: e.location_type, label: e.label, capacity: e.capacity }));

  const toUpdate = draftEntries.filter((e) => {
    const existing = existingByKey.get(`${e.location_type}:${e.label}`);
    return existing && existing.capacity !== e.capacity;
  });

  const toRemoveIds = (existingLocations ?? [])
    .filter((loc) => !draftKeys.has(`${loc.location_type}:${loc.label}`) && !assignedLocationIds.has(loc.id))
    .map((loc) => loc.id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("locations").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  for (const entry of toUpdate) {
    const existing = existingByKey.get(`${entry.location_type}:${entry.label}`)!;
    const { error } = await supabase.from("locations").update({ capacity: entry.capacity }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  }

  if (toRemoveIds.length > 0) {
    const { error } = await supabase.from("locations").delete().in("id", toRemoveIds);
    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0 || toUpdate.length > 0 || toRemoveIds.length > 0) {
    revalidatePath(`/events/${eventId}/staffing`);
  }

  return { added: toInsert.length, updated: toUpdate.length, removed: toRemoveIds.length };
}

// Deletes every table/food stand for the event (and, via cascade, any
// waiter assignments to them) - an explicit, deliberate reset the manager
// asked for directly, unlike the sketch-sync above which protects staffed
// locations from being silently swept away.
export async function deleteAllLocations(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

const TABLE_SKETCH_BUCKET = "event-sketches";

export async function uploadTableSketch(
  eventId: string,
  formData: FormData,
): Promise<{ added: number; updated: number; removed: number }> {
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

  // Auto-fill the seated-chairs count AND sync the sketch's tables/food
  // stands into `locations` - both only possible for iPlan PDF exports
  // (image sketches have no extractable text). This is what used to be a
  // separate "ייבוא סקיצת שולחנות" wizard the manager had to run as its own
  // step after uploading; per venue request, uploading the sketch is now the
  // one action that does both, and re-uploading an updated sketch keeps the
  // table list in sync rather than just piling new rows on top of old ones.
  // Left untouched if parsing fails or finds no tables, so a manager can
  // still fill in the chair count and manage locations by hand either way.
  let seatedChairsCount: string | null = null;
  let syncResult = { added: 0, updated: 0, removed: 0 };
  if (ext === "pdf") {
    try {
      const draft = parseTableSketchDraft(await extractPdfText(buffer));
      if (draft.tables.length > 0) {
        seatedChairsCount = String(draft.tables.reduce((sum, t) => sum + t.seated, 0));
      }
      syncResult = await syncLocationsFromSketch(eventId, draft);
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
  return syncResult;
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

export async function assignWaiter(
  eventId: string,
  locationId: string,
  waiterId: string,
  role: WaiterRole | WaiterSkill,
) {
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
