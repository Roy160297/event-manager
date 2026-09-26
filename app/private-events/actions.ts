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

export async function addSupplier(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) throw new Error("שם הספק הוא שדה חובה");

  const { count } = await supabase
    .from("private_event_suppliers")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase
    .from("private_event_suppliers")
    .insert({ event_id: eventId, name, role, phone, sort_order: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}`);
}

export async function updateSupplier(eventId: string, supplierId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) throw new Error("שם הספק הוא שדה חובה");

  const { error } = await supabase.from("private_event_suppliers").update({ name, role, phone }).eq("id", supplierId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}`);
}

export async function deleteSupplier(eventId: string, supplierId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_suppliers").delete().eq("id", supplierId);
  if (error) throw new Error(error.message);
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
