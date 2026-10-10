"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdfImport";
import { normalizeWaiterName, parseEventWaiterRoster } from "@/lib/eventWaiterImport";
import { parseTableSketchDraft } from "@/lib/tableSketchImport";
import { syncLocationsFromSketch } from "@/lib/sketchSync";
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
      syncResult = await syncLocationsFromSketch(supabase, eventId, draft);
      if (syncResult.added + syncResult.updated + syncResult.removed > 0) revalidatePath(`/events/${eventId}/staffing`);
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

// Replaces the event's waiter roster with the uploaded file. Anyone in the
// file who isn't in the permanent pool yet is added to it (names reported
// back so the UI can tell the user who was new); re-uploading simply swaps
// the roster, leaving any table assignments already made untouched.
export async function importEventWaiters(
  eventId: string,
  formData: FormData,
): Promise<{ total: number; addedNames: string[] }> {
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ");
  if (!/\.xlsx?$/i.test(file.name)) throw new Error("יש להעלות קובץ Excel (xlsx)");

  const roster = parseEventWaiterRoster(Buffer.from(await file.arrayBuffer()));
  if (roster.length === 0) throw new Error("לא נמצאו מלצרים בקובץ");

  const { data: pool, error: poolError } = await supabase
    .from("waiters")
    .select("id, name")
    .returns<{ id: string; name: string }[]>();
  if (poolError) throw new Error(poolError.message);

  const idByName = new Map((pool ?? []).map((waiter) => [normalizeWaiterName(waiter.name), waiter.id]));

  const missing = roster.filter((waiter) => !idByName.has(normalizeWaiterName(waiter.name)));
  if (missing.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("waiters")
      .insert(missing.map((waiter) => ({ name: waiter.name, phone: waiter.phone })))
      .select("id, name")
      .returns<{ id: string; name: string }[]>();
    if (insertError) {
      throw new Error(
        insertError.message.includes("row-level security")
          ? "אין הרשאה להוסיף מלצרים חדשים למאגר המלצרים"
          : insertError.message,
      );
    }
    for (const waiter of inserted ?? []) idByName.set(normalizeWaiterName(waiter.name), waiter.id);
  }

  const { error: deleteError } = await supabase.from("event_waiters").delete().eq("event_id", eventId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: rosterError } = await supabase.from("event_waiters").insert(
    roster.map((waiter) => ({
      event_id: eventId,
      waiter_id: idByName.get(normalizeWaiterName(waiter.name)),
      shift_role: waiter.shiftRole,
      arrival_time: waiter.arrival,
      end_time: waiter.end,
    })),
  );
  if (rosterError) throw new Error(rosterError.message);

  revalidatePath(`/events/${eventId}/staffing`);
  revalidatePath("/waiters");
  return { total: roster.length, addedNames: missing.map((waiter) => waiter.name) };
}

export async function clearEventWaiters(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_waiters").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}
