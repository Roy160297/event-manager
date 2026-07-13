"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventStatus, EventType } from "@/lib/types";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "other") as EventType;
  const eventDate = String(formData.get("event_date") ?? "");
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !eventDate) {
    throw new Error("שם האירוע ותאריך הם שדות חובה");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ name, event_type: eventType, event_date: eventDate, venue, notes })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

export async function updateEventStatus(eventId: string, status: EventStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}
