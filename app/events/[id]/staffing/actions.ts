"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdfImport";
import { normalizeWaiterName, parseEventWaiterRoster } from "@/lib/eventWaiterImport";
import { parseTableSketchDraft } from "@/lib/tableSketchImport";
import { syncLocationsFromSketch } from "@/lib/sketchSync";
import { planSkillAssignments } from "@/lib/waiterAutoAssign";
import { EVENT_DUTIES, dutyPhase } from "@/lib/waiterDuties";
import type { EventDuty, EventPhase, LocationRow, LocationType, WaiterSkill } from "@/lib/types";

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

// Puts a waiter on a table or food stand for one phase. The duty is implied by
// the location (a stand -> "station", a table -> "table"); tables only exist in
// the hall phase.
export async function assignWaiter(
  eventId: string,
  locationId: string,
  waiterId: string,
  phase: "reception" | "hall",
) {
  if (!waiterId) return;
  const supabase = await createClient();
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("location_type")
    .eq("id", locationId)
    .single<{ location_type: LocationType }>();
  if (locationError || !location) throw new Error("השולחן/העמדה לא נמצא");
  if (location.location_type === "table" && phase === "reception") throw new Error("שולחנות משובצים רק בשלב האולם");

  const { error } = await supabase.from("waiter_assignments").insert({
    event_id: eventId,
    location_id: locationId,
    waiter_id: waiterId,
    role: location.location_type === "table" ? "table" : "station",
    phase,
  });
  if (error) {
    throw new Error(error.code === "23505" ? "המלצר כבר משובץ כאן" : error.message);
  }
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function unassignWaiter(eventId: string, assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiter_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

async function readRosterFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ");
  if (!/\.xlsx?$/i.test(file.name)) throw new Error("יש להעלות קובץ Excel (xlsx)");
  const roster = parseEventWaiterRoster(Buffer.from(await file.arrayBuffer()));
  if (roster.length === 0) throw new Error("לא נמצאו מלצרים בקובץ");
  return roster;
}

// First step of the roster upload: reads the file without saving anything and
// reports who in it is not in the permanent waiters pool yet, so the UI can
// ask whether to add them.
export async function previewEventWaiters(
  formData: FormData,
): Promise<{ total: number; unknown: { name: string; phone: string | null; shiftRole: string | null }[] }> {
  const supabase = await createClient();
  const roster = await readRosterFile(formData);

  const { data: pool, error } = await supabase.from("waiters").select("name").returns<{ name: string }[]>();
  if (error) throw new Error(error.message);
  const known = new Set((pool ?? []).map((waiter) => normalizeWaiterName(waiter.name)));

  return {
    total: roster.length,
    unknown: roster
      .filter((waiter) => !known.has(normalizeWaiterName(waiter.name)))
      .map(({ name, phone, shiftRole }) => ({ name, phone, shiftRole })),
  };
}

// Replaces the event's waiter roster with the uploaded file. Anyone in the
// file who isn't in the permanent pool is added to it only if their name is in
// `add_names` (the answer to the preview question); the rest are skipped and
// reported back. Re-uploading swaps the roster; assignments already made are
// left untouched.
export async function importEventWaiters(
  eventId: string,
  formData: FormData,
): Promise<{ total: number; addedNames: string[]; skippedNames: string[] }> {
  const supabase = await createClient();
  const roster = await readRosterFile(formData);

  let addNames: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("add_names") ?? "[]"));
    if (Array.isArray(parsed)) addNames = parsed.map(String);
  } catch {
    // Treated as "add nobody".
  }
  const toAdd = new Set(addNames.map(normalizeWaiterName));

  const { data: pool, error: poolError } = await supabase
    .from("waiters")
    .select("id, name")
    .returns<{ id: string; name: string }[]>();
  if (poolError) throw new Error(poolError.message);

  const idByName = new Map((pool ?? []).map((waiter) => [normalizeWaiterName(waiter.name), waiter.id]));

  const missing = roster.filter((waiter) => !idByName.has(normalizeWaiterName(waiter.name)));
  const newWaiters = missing.filter((waiter) => toAdd.has(normalizeWaiterName(waiter.name)));
  const skipped = missing.filter((waiter) => !toAdd.has(normalizeWaiterName(waiter.name)));

  if (newWaiters.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("waiters")
      .insert(newWaiters.map((waiter) => ({ name: waiter.name, phone: waiter.phone })))
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

  const rosterRows = roster
    .filter((waiter) => idByName.has(normalizeWaiterName(waiter.name)))
    .map((waiter) => ({
      event_id: eventId,
      waiter_id: idByName.get(normalizeWaiterName(waiter.name)),
      shift_role: waiter.shiftRole,
      arrival_time: waiter.arrival,
      end_time: waiter.end,
    }));
  if (rosterRows.length === 0) throw new Error("אף מלצר מהקובץ לא נוסף לאירוע");

  const { error: deleteError } = await supabase.from("event_waiters").delete().eq("event_id", eventId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: rosterError } = await supabase.from("event_waiters").insert(rosterRows);
  if (rosterError) throw new Error(rosterError.message);

  revalidatePath(`/events/${eventId}/staffing`);
  revalidatePath("/waiters");
  return {
    total: rosterRows.length,
    addedNames: newWaiters.map((waiter) => waiter.name),
    skippedNames: skipped.map((waiter) => waiter.name),
  };
}

export async function clearEventWaiters(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_waiters").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

// Assigns a waiter to an event-level duty (door, runner, hall prep, ...), as
// opposed to assignWaiter above which attaches them to a table/stand.
export async function assignDuty(eventId: string, waiterId: string, duty: EventDuty) {
  if (!waiterId) return;
  if (!EVENT_DUTIES.includes(duty)) throw new Error("תפקיד לא תקין");
  const supabase = await createClient();
  const { error } = await supabase
    .from("waiter_assignments")
    .insert({ event_id: eventId, location_id: null, waiter_id: waiterId, role: duty, phase: dutyPhase(duty) });
  if (error) {
    throw new Error(error.code === "23505" ? "המלצר כבר משובץ לתפקיד הזה" : error.message);
  }
  revalidatePath(`/events/${eventId}/staffing`);
}

export interface AutoAssignResult {
  assigned: number;
  shortages: { duty: WaiterSkill; missing: number }[];
  unstaffed: { receptionStands: number; hallStands: number; tables: number };
}

// Fills whatever is still open for the event's roster according to each
// waiter's skills (see lib/waiterAutoAssign.ts). Only adds - existing
// assignments are never touched.
export async function autoAssignBySkills(eventId: string): Promise<AutoAssignResult> {
  const supabase = await createClient();

  const [{ data: eventWaiters }, { data: waiters }, { data: skills }, { data: locations }, { data: existing }] =
    await Promise.all([
      supabase.from("event_waiters").select("waiter_id, shift_role").eq("event_id", eventId),
      supabase.from("waiters").select("id, name"),
      supabase.from("waiter_skills").select("waiter_id, skill"),
      supabase.from("locations").select("id, location_type, label").eq("event_id", eventId).returns<LocationRow[]>(),
      supabase.from("waiter_assignments").select("waiter_id, location_id, role, phase").eq("event_id", eventId),
    ]);

  if (!eventWaiters || eventWaiters.length === 0) throw new Error("יש להעלות קודם רשימת מלצרים לאירוע");

  const skillsByWaiter = new Map<string, WaiterSkill[]>();
  for (const row of skills ?? []) {
    skillsByWaiter.set(row.waiter_id, [...(skillsByWaiter.get(row.waiter_id) ?? []), row.skill as WaiterSkill]);
  }
  const nameById = new Map((waiters ?? []).map((waiter) => [waiter.id, waiter.name as string]));

  const plan = planSkillAssignments({
    waiters: eventWaiters
      .filter((entry) => nameById.has(entry.waiter_id))
      .map((entry) => ({
        id: entry.waiter_id as string,
        name: nameById.get(entry.waiter_id)!,
        skills: skillsByWaiter.get(entry.waiter_id) ?? [],
        shiftRole: entry.shift_role as string | null,
      })),
    locations: (locations ?? []).map((location) => ({
      id: location.id,
      type: location.location_type,
      label: location.label,
    })),
    existing: (existing ?? []).map((row) => ({
      waiterId: row.waiter_id as string,
      locationId: row.location_id as string | null,
      role: row.role as string,
      phase: row.phase as EventPhase,
    })),
  });

  if (plan.assignments.length > 0) {
    const { error } = await supabase.from("waiter_assignments").insert(
      plan.assignments.map((assignment) => ({
        event_id: eventId,
        waiter_id: assignment.waiterId,
        location_id: assignment.locationId,
        role: assignment.role,
        phase: assignment.phase,
      })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/staffing`);
  return { assigned: plan.assignments.length, shortages: plan.shortages, unstaffed: plan.unstaffed };
}

// Removes every waiter assignment of the event (tables, stands and duties) so
// the automatic assignment can be run again from scratch.
export async function clearAllAssignments(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiter_assignments").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

// Re-reads the sketch that is already saved on the event and syncs the tables
// and food stands from it (the same sync the upload does) - for when the list
// was cleared or came out wrong and should be rebuilt from the sketch.
export async function reimportLocationsFromSketch(
  eventId: string,
): Promise<{ added: number; updated: number; removed: number; tables: number; stands: number; warnings: string[] }> {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("table_sketch_path")
    .eq("id", eventId)
    .single<{ table_sketch_path: string | null }>();
  if (eventError) throw new Error(eventError.message);
  const path = event?.table_sketch_path;
  if (!path) throw new Error("לא הועלתה סקיצה לאירוע");
  if (!path.toLowerCase().endsWith(".pdf")) throw new Error("ניתן לייבא שולחנות ועמדות רק מסקיצת PDF מ-iPlan");

  const { data: file, error: downloadError } = await supabase.storage.from(TABLE_SKETCH_BUCKET).download(path);
  if (downloadError || !file) throw new Error(downloadError?.message ?? "לא ניתן לקרוא את הסקיצה");

  const draft = parseTableSketchDraft(await extractPdfText(Buffer.from(await file.arrayBuffer())));
  if (draft.tables.length === 0 && draft.foodStands.length === 0) {
    throw new Error(draft.warnings[0] ?? "לא זוהו שולחנות או עמדות בסקיצה");
  }

  const result = await syncLocationsFromSketch(supabase, eventId, draft);
  if (draft.tables.length > 0) {
    await supabase
      .from("events")
      .update({ sketch_seated_chairs_count: String(draft.tables.reduce((sum, t) => sum + t.seated, 0)) })
      .eq("id", eventId);
  }

  revalidatePath(`/events/${eventId}/staffing`);
  return { ...result, tables: draft.tables.length, stands: draft.foodStands.length, warnings: draft.warnings };
}
