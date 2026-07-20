"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsvBuffer, parseExcelBuffer, type ParsedCsv } from "@/lib/csv-import";

export interface GuestColumnMapping {
  name: string;
  party_size?: string;
  seating_table?: string;
}

export async function parseGuestFile(formData: FormData): Promise<ParsedCsv> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const isExcel = /\.xlsx?$/i.test(file.name);
  return isExcel ? parseExcelBuffer(buffer) : parseCsvBuffer(buffer);
}

export async function importGuests(
  eventId: string,
  rows: Record<string, string>[],
  mapping: GuestColumnMapping,
) {
  const supabase = await createClient();

  const guests = rows
    .map((row) => ({
      event_id: eventId,
      name: (mapping.name ? row[mapping.name] : "")?.trim(),
      party_size: mapping.party_size ? Number(row[mapping.party_size]) || 1 : 1,
      seating_table: mapping.seating_table ? row[mapping.seating_table]?.trim() || null : null,
    }))
    .filter((guest) => guest.name);

  if (guests.length === 0) {
    throw new Error("לא נמצאו אורחים תקינים לייבוא — ודאו שהוגדרה עמודת השם");
  }

  // A new import always reflects the venue's latest full guest list, not an
  // addition to it - replace the existing list rather than appending, so
  // re-imports can't create duplicates or leave stale guests behind.
  const { error: deleteError } = await supabase.from("guests").delete().eq("event_id", eventId);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabase.from("guests").insert(guests);
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/guests`);
}

export async function deleteGuest(eventId: string, guestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("guests").delete().eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/guests`);
}

export async function deleteAllGuests(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("guests").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/guests`);
}

export async function updateGuest(eventId: string, guestId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const partySize = Number(formData.get("party_size") ?? 1) || 1;
  const seatingTable = String(formData.get("seating_table") ?? "").trim() || null;

  if (!name) throw new Error("שם האורח הוא שדה חובה");

  const { error } = await supabase
    .from("guests")
    .update({ name, party_size: partySize, seating_table: seatingTable })
    .eq("id", guestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/guests`);
}
