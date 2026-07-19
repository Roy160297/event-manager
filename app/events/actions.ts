"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "other") as EventType;
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name || !eventType || !eventDate) {
    throw new Error("שם הלקוח, סוג האירוע ותאריך הם שדות חובה");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ name, event_type: eventType, event_date: eventDate })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateEventDetails(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "other") as EventType;
  const eventDate = String(formData.get("event_date") ?? "");
  const startTime = String(formData.get("start_time") ?? "").trim() || null;
  const endTime = String(formData.get("end_time") ?? "").trim() || null;
  const managerId = String(formData.get("manager_id") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const contactEmail2 = String(formData.get("contact_email_2") ?? "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactPhone2 = String(formData.get("contact_phone_2") ?? "").trim() || null;
  const estimatedGuestsRaw = String(formData.get("estimated_guests") ?? "").trim();
  const estimatedGuests = estimatedGuestsRaw ? Number(estimatedGuestsRaw) : null;
  const salesPersonName = String(formData.get("sales_person_name") ?? "").trim() || null;
  const serviceStyle = String(formData.get("service_style") ?? "").trim() || null;
  const brideParentsNames = String(formData.get("bride_parents_names") ?? "").trim() || null;
  const groomParentsNames = String(formData.get("groom_parents_names") ?? "").trim() || null;
  const menuNotes = String(formData.get("menu_notes") ?? "").trim() || null;
  const parkingNotes = String(formData.get("parking_notes") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !eventType || !eventDate) {
    throw new Error("שם הלקוח, סוג האירוע ותאריך הם שדות חובה");
  }

  const { error } = await supabase
    .from("events")
    .update({
      name,
      event_type: eventType,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      manager_id: managerId,
      contact_email: contactEmail,
      contact_email_2: contactEmail2,
      contact_phone: contactPhone,
      contact_phone_2: contactPhone2,
      estimated_guests: estimatedGuests,
      sales_person_name: salesPersonName,
      service_style: serviceStyle,
      bride_parents_names: brideParentsNames,
      groom_parents_names: groomParentsNames,
      menu_notes: menuNotes,
      parking_notes: parkingNotes,
      notes,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}

export async function updateEventSummaryReport(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const num = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw ? Number(raw) : null;
  };

  const { error } = await supabase
    .from("events")
    .update({
      production_company: text("production_company"),
      exit_time: text("exit_time"),
      final_guest_count_counter: num("final_guest_count_counter"),
      final_guest_count_iplan: text("final_guest_count_iplan"),
      reserve_opened_count: num("reserve_opened_count"),
      bar_manager_name: text("bar_manager_name"),
      bartender_count: text("bartender_count"),
      floor_manager_name: text("floor_manager_name"),
      waiter_count: num("waiter_count"),
      cook_count: num("cook_count"),
      kitchen_dishwasher_count: num("kitchen_dishwasher_count"),
      dishwasher_count: num("dishwasher_count"),
      security_notes: text("security_notes"),
      report_summary: text("report_summary"),
      report_general_notes: text("report_general_notes"),
      hall_cleaner_hours: text("hall_cleaner_hours"),
      restroom_cleaner_hours: text("restroom_cleaner_hours"),
      kitchen_dishwasher_hours: text("kitchen_dishwasher_hours"),
      dishwasher_hours: text("dishwasher_hours"),
      photographer_contact: text("photographer_contact"),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tasks`);
}

export async function addManager(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("manager_name") ?? "").trim();

  if (!name) {
    throw new Error("שם האחראי הוא שדה חובה");
  }

  const { error } = await supabase.from("staff").insert({ name });
  if (error) throw new Error(error.message);
}

export async function deleteManager(staffId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
}

export async function updateManager(staffId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("manager_name") ?? "").trim();

  if (!name) {
    throw new Error("שם האחראי הוא שדה חובה");
  }

  const { error } = await supabase.from("staff").update({ name }).eq("id", staffId);
  if (error) throw new Error(error.message);
}

export async function addSupplier(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) throw new Error("שם הספק הוא שדה חובה");

  const { count } = await supabase
    .from("event_suppliers")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase
    .from("event_suppliers")
    .insert({ event_id: eventId, name, role, phone, sort_order: count ?? 0 });
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
}

export async function updateSupplier(eventId: string, supplierId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) throw new Error("שם הספק הוא שדה חובה");

  const { error } = await supabase
    .from("event_suppliers")
    .update({ name, role, phone })
    .eq("id", supplierId);
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
}

export async function deleteSupplier(eventId: string, supplierId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_suppliers").delete().eq("id", supplierId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}
