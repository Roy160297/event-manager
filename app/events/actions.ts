"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { applyDefaultSchedule } from "@/app/events/[id]/timeline/actions";
import { applyDefaultMenu } from "@/app/events/[id]/menu/actions";
import { assertNoDuplicateEventDate } from "@/lib/eventValidation";
import { checkRemindersForEvent } from "@/lib/reminderRunner";
import { maybeCreateDjSketchTask } from "@/lib/djSketchReminder";
import { extractSuppliersFromImage, type SupplierImportDraft } from "@/lib/supplierImport";
import { extractEventDraftFromImage } from "@/lib/imageImport";
import { sendChecklistsEmail } from "@/lib/checklistEmail";
import type { EventRow, EventType, StaffRow } from "@/lib/types";

// Returns an error message on failure instead of throwing (except for
// redirect(), whose internal control-flow signal is never caught here) -
// Next.js redacts thrown Server Action error messages to a generic string
// in production, so a returned value is the only way the caller's
// useActionState sees the real text.
export async function createEvent(formData: FormData): Promise<string | void> {
  const supabase = await createClient();
  const currentStaff = await getCurrentStaff();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "other") as EventType;
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name || !eventType || !eventDate) {
    return "שם הלקוח, סוג האירוע ותאריך הם שדות חובה";
  }
  try {
    await assertNoDuplicateEventDate(supabase, eventDate);
  } catch (err) {
    return err instanceof Error ? err.message : "שגיאה ביצירת האירוע";
  }

  const managerId = currentStaff?.id ?? null;

  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      event_type: eventType,
      event_date: eventDate,
      start_time: "19:30",
      end_time: "03:00",
      manager_id: managerId,
    })
    .select("id")
    .single();

  if (error) return error.message;

  await applyDefaultSchedule(data.id, eventType, eventDate);
  await applyDefaultMenu(data.id, eventType);
  await checkRemindersForEvent(data.id);

  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/events/trash");
}

export async function restoreEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ deleted_at: null }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/events/trash");
}

export async function permanentlyDeleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events/trash");
}

export async function updateEventDetails(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "other") as EventType;
  const eventDate = String(formData.get("event_date") ?? "");
  const coupleMeetingDate = String(formData.get("couple_meeting_date") ?? "").trim() || null;
  const startTime = String(formData.get("start_time") ?? "").trim() || null;
  const endTime = String(formData.get("end_time") ?? "").trim() || null;
  const managerId = String(formData.get("manager_id") ?? "").trim() || null;
  const floorManagerId = String(formData.get("floor_manager_id") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const contactEmail2 = String(formData.get("contact_email_2") ?? "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactPhone2 = String(formData.get("contact_phone_2") ?? "").trim() || null;
  const estimatedGuests = String(formData.get("estimated_guests") ?? "").trim() || null;
  const kidsMealCount = String(formData.get("kids_meal_count") ?? "").trim() || null;
  const glatMealCount = String(formData.get("glat_meal_count") ?? "").trim() || null;
  const vegetarianMealCount = String(formData.get("vegetarian_meal_count") ?? "").trim() || null;
  const veganMealCount = String(formData.get("vegan_meal_count") ?? "").trim() || null;
  const glutenFreeMealCount = String(formData.get("gluten_free_meal_count") ?? "").trim() || null;
  const toddlersUnder2Count = String(formData.get("toddlers_under_2_count") ?? "").trim() || null;
  const salesPersonId = String(formData.get("sales_person_id") ?? "").trim() || null;
  const brideParentsNames = String(formData.get("bride_parents_names") ?? "").trim() || null;
  const groomParentsNames = String(formData.get("groom_parents_names") ?? "").trim() || null;
  const menuNotes = String(formData.get("menu_notes") ?? "").trim() || null;
  const parkingNotes = String(formData.get("parking_notes") ?? "").trim() || null;

  if (!name || !eventType || !eventDate) {
    throw new Error("שם הלקוח, סוג האירוע ותאריך הם שדות חובה");
  }
  await assertNoDuplicateEventDate(supabase, eventDate, eventId);

  const { error } = await supabase
    .from("events")
    .update({
      name,
      event_type: eventType,
      event_date: eventDate,
      couple_meeting_date: coupleMeetingDate,
      start_time: startTime,
      end_time: endTime,
      manager_id: managerId,
      floor_manager_id: floorManagerId,
      contact_email: contactEmail,
      contact_email_2: contactEmail2,
      contact_phone: contactPhone,
      contact_phone_2: contactPhone2,
      estimated_guests: estimatedGuests,
      kids_meal_count: kidsMealCount,
      glat_meal_count: glatMealCount,
      vegetarian_meal_count: vegetarianMealCount,
      vegan_meal_count: veganMealCount,
      gluten_free_meal_count: glutenFreeMealCount,
      toddlers_under_2_count: toddlersUnder2Count,
      sales_person_id: salesPersonId,
      bride_parents_names: brideParentsNames,
      groom_parents_names: groomParentsNames,
      menu_notes: menuNotes,
      parking_notes: parkingNotes,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  await checkRemindersForEvent(eventId);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}

export async function updateEventSummaryReport(eventId: string, formData: FormData) {
  const supabase = await createClient();

  // Summary-report fields live on the same `events` row as core event
  // fields (gated by events:write via RLS), so RLS can't separate them -
  // Postgres row-level security has no notion of "these specific columns."
  // Enforce the dedicated event_summary_report permission here instead.
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "event_summary_report")) {
    throw new Error("אין לך הרשאה לערוך את דוח סיכום האירוע");
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const { error } = await supabase
    .from("events")
    .update({
      production_company: text("production_company"),
      exit_time: text("exit_time"),
      report_end_time: text("report_end_time"),
      final_guest_count_counter: text("final_guest_count_counter"),
      final_guest_count_iplan: text("final_guest_count_iplan"),
      reserve_opened_count: text("reserve_opened_count"),
      bar_manager_name: text("bar_manager_name"),
      bartender_count: text("bartender_count"),
      floor_manager_name: text("floor_manager_name"),
      waiter_count: text("waiter_count"),
      cook_count: text("cook_count"),
      kitchen_dishwasher_count: text("kitchen_dishwasher_count"),
      dishwasher_count: text("dishwasher_count"),
      security_guard_count: text("security_guard_count"),
      security_guard_hours: text("security_guard_hours"),
      report_summary: text("report_summary"),
      report_general_notes: text("report_general_notes"),
      hall_cleaner_hours: text("hall_cleaner_hours"),
      restroom_cleaner_hours: text("restroom_cleaner_hours"),
      kitchen_dishwasher_hours: text("kitchen_dishwasher_hours"),
      dishwasher_hours: text("dishwasher_hours"),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tasks`);
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

  await maybeCreateDjSketchTask(supabase, eventId, [name]);
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

  await maybeCreateDjSketchTask(supabase, eventId, [name]);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteSupplier(eventId: string, supplierId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_suppliers").delete().eq("id", supplierId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}

export interface EventImageUpdateDraft {
  name: string;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  manager_id: string | null;
  sales_person_id: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  estimated_guests: string | null;
  kids_meal_count: string | null;
  glat_meal_count: string | null;
  vegetarian_meal_count: string | null;
  vegan_meal_count: string | null;
  gluten_free_meal_count: string | null;
  toddlers_under_2_count: string | null;
  warnings: string[];
  // Keys (matching this interface's own field names) whose merged value
  // actually differs from what's currently saved on the event - lets the
  // review screen bold only the fields the screenshot is really changing.
  changedFields: string[];
}

// Parses an updated "ענן" screenshot for an EXISTING event and merges it onto
// the event's current field values - unlike the create-from-image flow, a
// field the screenshot doesn't show (null) must fall back to what's already
// saved rather than wiping it, since this is an update, not a fresh import.
export async function parseEventImageUpdate(eventId: string, formData: FormData): Promise<EventImageUpdateDraft> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("הקובץ שנבחר אינו תמונה");
  }

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).returns<EventRow[]>().single();
  if (!event) throw new Error("האירוע לא נמצא");

  const buffer = Buffer.from(await file.arrayBuffer());
  const draft = await extractEventDraftFromImage(buffer, file.type);

  const name = draft.bride_name && draft.groom_name
    ? `${draft.bride_name} ו${draft.groom_name}`
    : draft.bride_name || draft.groom_name || event.name;

  let managerId = event.manager_id;
  let salesPersonId = event.sales_person_id;
  if (draft.event_manager_name || draft.sales_person_name) {
    const { data: staff } = await supabase.from("staff").select("id, name").returns<StaffRow[]>();
    if (draft.event_manager_name) {
      const match = staff?.find((s) => s.name.trim().toLowerCase() === draft.event_manager_name!.trim().toLowerCase());
      if (match) managerId = match.id;
    }
    if (draft.sales_person_name) {
      const match = staff?.find((s) => s.name.trim().toLowerCase() === draft.sales_person_name!.trim().toLowerCase());
      if (match) salesPersonId = match.id;
    }
  }

  const merged: Omit<EventImageUpdateDraft, "warnings" | "changedFields"> = {
    name,
    event_type: draft.event_type,
    event_date: draft.event_date ?? event.event_date,
    start_time: draft.start_time ?? event.start_time,
    end_time: draft.end_time ?? event.end_time,
    manager_id: managerId,
    sales_person_id: salesPersonId,
    contact_email: draft.contact_email ?? event.contact_email,
    contact_email_2: draft.contact_email_2 ?? event.contact_email_2,
    contact_phone: draft.contact_phone ?? event.contact_phone,
    contact_phone_2: draft.contact_phone_2 ?? event.contact_phone_2,
    estimated_guests: draft.estimated_guests ?? event.estimated_guests,
    kids_meal_count: draft.kids_meal_count ?? event.kids_meal_count,
    glat_meal_count: draft.glat_meal_count ?? event.glat_meal_count,
    vegetarian_meal_count: draft.vegetarian_meal_count ?? event.vegetarian_meal_count,
    vegan_meal_count: draft.vegan_meal_count ?? event.vegan_meal_count,
    gluten_free_meal_count: draft.gluten_free_meal_count ?? event.gluten_free_meal_count,
    toddlers_under_2_count: draft.toddlers_under_2_count ?? event.toddlers_under_2_count,
  };

  const previous: Record<keyof typeof merged, string | null> = {
    name: event.name,
    event_type: event.event_type,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    manager_id: event.manager_id,
    sales_person_id: event.sales_person_id,
    contact_email: event.contact_email,
    contact_email_2: event.contact_email_2,
    contact_phone: event.contact_phone,
    contact_phone_2: event.contact_phone_2,
    estimated_guests: event.estimated_guests,
    kids_meal_count: event.kids_meal_count,
    glat_meal_count: event.glat_meal_count,
    vegetarian_meal_count: event.vegetarian_meal_count,
    vegan_meal_count: event.vegan_meal_count,
    gluten_free_meal_count: event.gluten_free_meal_count,
    toddlers_under_2_count: event.toddlers_under_2_count,
  };
  const changedFields = (Object.keys(merged) as (keyof typeof merged)[]).filter(
    (key) => merged[key] !== previous[key],
  );

  // The shared extractor's boilerplate warning is worded for the
  // create-event flow ("לפני יצירת האירוע") - reword it for this update
  // context so it doesn't misleadingly suggest a new event is being made.
  const warnings = draft.warnings.map((w) =>
    w === "החילוץ מתמונה עלול לכלול טעויות - יש לבדוק את כל השדות בקפידה לפני יצירת האירוע."
      ? "החילוץ מתמונה עלול לכלול טעויות - יש לבדוק את כל השדות בקפידה לפני עדכון האירוע."
      : w,
  );

  return { ...merged, warnings, changedFields };
}

export async function applyEventImageUpdate(eventId: string, draft: EventImageUpdateDraft) {
  const supabase = await createClient();

  const name = draft.name.trim();
  if (!name || !draft.event_type || !draft.event_date) {
    throw new Error("שם, סוג אירוע ותאריך הם שדות חובה");
  }
  await assertNoDuplicateEventDate(supabase, draft.event_date, eventId);

  const { error } = await supabase
    .from("events")
    .update({
      name,
      event_type: draft.event_type,
      event_date: draft.event_date,
      start_time: draft.start_time,
      end_time: draft.end_time,
      manager_id: draft.manager_id,
      sales_person_id: draft.sales_person_id,
      contact_email: draft.contact_email,
      contact_email_2: draft.contact_email_2,
      contact_phone: draft.contact_phone,
      contact_phone_2: draft.contact_phone_2,
      estimated_guests: draft.estimated_guests,
      kids_meal_count: draft.kids_meal_count,
      glat_meal_count: draft.glat_meal_count,
      vegetarian_meal_count: draft.vegetarian_meal_count,
      vegan_meal_count: draft.vegan_meal_count,
      gluten_free_meal_count: draft.gluten_free_meal_count,
      toddlers_under_2_count: draft.toddlers_under_2_count,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  await checkRemindersForEvent(eventId);

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}

export async function parseSupplierImage(formData: FormData): Promise<SupplierImportDraft[]> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("הקובץ שנבחר אינו תמונה");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return extractSuppliersFromImage(buffer, file.type);
}

export async function sendAllChecklistsEmail({
  to,
  cc,
  subject,
  bodyText,
  replyTo,
  attachments,
}: {
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  replyTo?: string | null;
  attachments: { filename: string; base64: string }[];
}) {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "closing_checklist")) {
    throw new Error("אין לך הרשאה לשלוח את הצ'קליסטים");
  }
  if (attachments.length === 0) throw new Error("אין צ'קליסטים לשליחה");

  await sendChecklistsEmail({ to, cc, subject, bodyText, replyTo, attachments });
}

export async function addSuppliersFromImport(eventId: string, suppliers: SupplierImportDraft[]) {
  const validSuppliers = suppliers.filter((supplier) => supplier.name.trim());
  if (validSuppliers.length === 0) throw new Error("אין ספקים תקינים להוספה");

  const supabase = await createClient();
  const { count } = await supabase
    .from("event_suppliers")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("event_suppliers").insert(
    validSuppliers.map((supplier, index) => ({
      event_id: eventId,
      name: supplier.name.trim(),
      role: supplier.role?.trim() || null,
      phone: supplier.phone?.trim() || null,
      sort_order: (count ?? 0) + index,
    })),
  );
  if (error) throw new Error(error.message);

  await maybeCreateDjSketchTask(supabase, eventId, validSuppliers.map((s) => s.name));
  revalidatePath(`/events/${eventId}`);
}
