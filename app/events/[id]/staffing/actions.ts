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

export async function deleteLocation(eventId: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function assignWaiter(eventId: string, locationId: string, waiterId: string) {
  if (!waiterId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("waiter_assignments")
    .insert({ event_id: eventId, location_id: locationId, waiter_id: waiterId });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}

export async function unassignWaiter(eventId: string, assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiter_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/staffing`);
}
