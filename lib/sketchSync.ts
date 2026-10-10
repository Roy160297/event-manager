import type { SupabaseClient } from "@supabase/supabase-js";

// Syncs tables/food stands from a parsed sketch against what the event
// already has: adds anything new, updates a table's capacity if the sketch's
// number changed, and removes anything no longer in the sketch - but only if
// nothing is staffed there yet. A location with a waiter already assigned is
// left alone even if it's missing from the new sketch, since deleting it
// would cascade-delete that assignment (locations -> waiter_assignments is
// on delete cascade) and silently lose real scheduling work over what might
// just be a sketch mistake. Matches by label+type, since that's the only
// stable identifier a re-exported sketch gives us.
export async function syncLocationsFromSketch(
  supabase: SupabaseClient,
  eventId: string,
  draft: { tables: { label: string; capacity: number }[]; foodStands: { label: string }[] },
): Promise<{ added: number; updated: number; removed: number }> {
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

  return { added: toInsert.length, updated: toUpdate.length, removed: toRemoveIds.length };
}
