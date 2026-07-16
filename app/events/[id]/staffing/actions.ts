"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdfImport";
import { parseTableSketchDraft, type TableSketchDraft } from "@/lib/tableSketchImport";
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

// Creates a "table" location for every distinct guests.seating_table value
// that doesn't already have a matching location, so tables only need to be
// entered once (via the guest CSV import) rather than duplicated here.
export async function quickAddTablesFromGuests(eventId: string) {
  const supabase = await createClient();

  const [{ data: guests }, { data: existingLocations }] = await Promise.all([
    supabase.from("guests").select("seating_table, party_size").eq("event_id", eventId),
    supabase
      .from("locations")
      .select("label")
      .eq("event_id", eventId)
      .eq("location_type", "table"),
  ]);

  const existingLabels = new Set((existingLocations ?? []).map((loc) => loc.label));
  const guestCountByTable = new Map<string, number>();

  for (const guest of guests ?? []) {
    if (!guest.seating_table) continue;
    guestCountByTable.set(
      guest.seating_table,
      (guestCountByTable.get(guest.seating_table) ?? 0) + (guest.party_size || 1),
    );
  }

  const toInsert = Array.from(guestCountByTable.entries())
    .filter(([label]) => !existingLabels.has(label))
    .map(([label, guestCount]) => ({
      event_id: eventId,
      location_type: "table" as const,
      label,
      capacity: guestCount,
    }));

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("locations").insert(toInsert);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function parseTableSketchImport(formData: FormData): Promise<TableSketchDraft> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ PDF");

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  return parseTableSketchDraft(text);
}

export async function createLocationsFromSketch(
  eventId: string,
  draft: { tables: { label: string; capacity: number }[]; foodStands: { label: string }[] },
) {
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

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("locations").insert(toInsert);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

const TABLE_SKETCH_BUCKET = "event-sketches";

export async function uploadTableSketch(eventId: string, formData: FormData) {
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

  const { error } = await supabase.from("events").update({ table_sketch_path: path }).eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from(TABLE_SKETCH_BUCKET).remove([event.table_sketch_path]);
  }

  revalidatePath(`/events/${eventId}/staffing`);
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
