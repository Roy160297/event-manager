"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsvBuffer, type ParsedCsv } from "@/lib/csv-import";
import type { RsvpStatus } from "@/lib/types";

export interface GuestColumnMapping {
  name: string;
  email?: string;
  phone?: string;
  rsvp_status?: string;
  party_size?: string;
  dietary_notes?: string;
  seating_table?: string;
}

export async function parseGuestCsv(formData: FormData): Promise<ParsedCsv> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ CSV");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseCsvBuffer(buffer);
}

function mapRsvpStatus(raw: string | undefined): RsvpStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (["מאשר", "מגיע", "confirmed", "yes", "כן"].some((v) => value.includes(v))) {
    return "confirmed";
  }
  if (["לא מגיע", "מבטל", "declined", "no", "לא"].some((v) => value.includes(v))) {
    return "declined";
  }
  return "pending";
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
      email: mapping.email ? row[mapping.email]?.trim() || null : null,
      phone: mapping.phone ? row[mapping.phone]?.trim() || null : null,
      rsvp_status: mapping.rsvp_status ? mapRsvpStatus(row[mapping.rsvp_status]) : "pending",
      party_size: mapping.party_size ? Number(row[mapping.party_size]) || 1 : 1,
      dietary_notes: mapping.dietary_notes ? row[mapping.dietary_notes]?.trim() || null : null,
      seating_table: mapping.seating_table ? row[mapping.seating_table]?.trim() || null : null,
    }))
    .filter((guest) => guest.name);

  if (guests.length === 0) {
    throw new Error("לא נמצאו אורחים תקינים לייבוא — ודאו שהוגדרה עמודת השם");
  }

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
