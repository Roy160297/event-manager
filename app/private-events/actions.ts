"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PrivateEventType } from "@/lib/types";

export async function createPrivateEvent(formData: FormData): Promise<string | void> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "wedding") as PrivateEventType;
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name || !eventType || !eventDate) {
    return "שם הלקוח, סוג האירוע ותאריך הם שדות חובה";
  }

  const { data, error } = await supabase
    .from("private_events")
    .insert({ name, event_type: eventType, event_date: eventDate })
    .select("id")
    .single();

  if (error) return error.message;

  revalidatePath("/private-events");
  redirect(`/private-events/${data.id}`);
}

export async function updatePrivateEventDetails(eventId: string, formData: FormData): Promise<string | void> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "wedding") as PrivateEventType;
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name || !eventType || !eventDate) {
    return "שם הלקוח, סוג האירוע ותאריך הם שדות חובה";
  }

  const text = (field: string) => String(formData.get(field) ?? "").trim() || null;

  const { error } = await supabase
    .from("private_events")
    .update({
      name,
      event_type: eventType,
      event_date: eventDate,
      couple_meeting_date: text("couple_meeting_date"),
      start_time: text("start_time"),
      end_time: text("end_time"),
      hall_name: text("hall_name"),
      estimated_guests: text("estimated_guests"),
      kids_meal_count: text("kids_meal_count"),
      glat_meal_count: text("glat_meal_count"),
      vegetarian_meal_count: text("vegetarian_meal_count"),
      vegan_meal_count: text("vegan_meal_count"),
      gluten_free_meal_count: text("gluten_free_meal_count"),
      toddlers_under_2_count: text("toddlers_under_2_count"),
      bride_parents_names: text("bride_parents_names"),
      groom_parents_names: text("groom_parents_names"),
      contact_email: text("contact_email"),
      contact_email_2: text("contact_email_2"),
      contact_phone: text("contact_phone"),
      contact_phone_2: text("contact_phone_2"),
      additional_info: text("additional_info"),
    })
    .eq("id", eventId);

  if (error) return error.message;
  revalidatePath(`/private-events/${eventId}`);
}

export async function deletePrivateEvent(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("private_events")
    .select("table_sketch_path")
    .eq("id", eventId)
    .single();

  const { error } = await supabase.from("private_events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  if (event?.table_sketch_path) {
    await supabase.storage.from("private-event-sketches").remove([event.table_sketch_path]);
  }

  revalidatePath("/private-events");
}
