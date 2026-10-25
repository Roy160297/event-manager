"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractSuppliersFromImage, type SupplierImportDraft } from "@/lib/supplierImport";
import { isFriday } from "@/lib/scheduleTime";
import { applyDefaultSchedule } from "@/app/private-events/[id]/timeline/actions";
import { extractEventDraftFromImage, applyCarriedReservePercent } from "@/lib/imageImport";
import type { PrivateEventRow, PrivateEventType } from "@/lib/types";

export async function createPrivateEvent(formData: FormData): Promise<string | void> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "wedding") as PrivateEventType;
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name || !eventType || !eventDate) {
    return "שם הלקוח, סוג האירוע ותאריך הם שדות חובה";
  }

  // Same Friday-vs-evening default start time as the venue's own createEvent,
  // since the schedule templates below are written relative to one or the
  // other and a Friday event's actual start time drives how much the Friday
  // template gets shifted.
  const startTime = isFriday(eventDate) ? "12:00" : "19:30";

  const { data, error } = await supabase
    .from("private_events")
    .insert({ name, event_type: eventType, event_date: eventDate, start_time: startTime, end_time: "03:00" })
    .select("id")
    .single();

  if (error) return error.message;

  await applyDefaultSchedule(data.id, eventType, eventDate, startTime);

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

// Returns { error } on failure instead of throwing - Next.js redacts thrown
// Server Action error messages to a generic string in production regardless
// of where the throw is caught, so a returned value is the only way the
// caller sees the real text (e.g. a transient Gemini overload message).
export async function parseSupplierImage(formData: FormData): Promise<SupplierImportDraft[] | { error: string }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ תמונה");
    if (!file.type.startsWith("image/")) throw new Error("הקובץ שנבחר אינו תמונה");

    const buffer = Buffer.from(await file.arrayBuffer());
    return await extractSuppliersFromImage(buffer, file.type);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "שגיאה בעיבוד התמונה" };
  }
}

export async function addSuppliersFromImport(eventId: string, suppliers: SupplierImportDraft[]) {
  const validSuppliers = suppliers.filter((supplier) => supplier.name.trim());
  if (validSuppliers.length === 0) throw new Error("אין ספקים תקינים להוספה");

  const supabase = await createClient();
  const { count } = await supabase
    .from("private_event_suppliers")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("private_event_suppliers").insert(
    validSuppliers.map((supplier, index) => ({
      event_id: eventId,
      name: supplier.name.trim(),
      role: supplier.role?.trim() || null,
      phone: supplier.phone?.trim() || null,
      sort_order: (count ?? 0) + index,
    })),
  );
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

export interface PrivateEventImageUpdateDraft {
  name: string;
  event_type: PrivateEventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  estimated_guests: string | null;
  warnings: string[];
  // Field names whose merged value differs from what is saved - the review
  // screen bolds only those.
  changedFields: string[];
  // What every field holds on the event now, for putting one field back.
  original: Record<string, string | null>;
}

// Returns { error } instead of throwing: Next.js redacts thrown Server Action
// messages in production, so only a returned value shows the real text.
export async function parsePrivateEventImageUpdate(
  eventId: string,
  formData: FormData,
): Promise<PrivateEventImageUpdateDraft | { error: string }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור קובץ תמונה");
    if (!file.type.startsWith("image/")) throw new Error("הקובץ שנבחר אינו תמונה");

    const supabase = await createClient();
    const { data: event } = await supabase.from("private_events").select("*").eq("id", eventId).returns<PrivateEventRow[]>().single();
    if (!event) throw new Error("האירוע לא נמצא");

    const draft = await extractEventDraftFromImage(Buffer.from(await file.arrayBuffer()), file.type);

    const name =
      draft.bride_name && draft.groom_name
        ? `${draft.bride_name} ו${draft.groom_name}`
        : draft.bride_name || draft.groom_name || event.name;

    // A guest-count email never states the event type, so extraction falls
    // back to "other" - keep the saved type then, as the venue flow does.
    const eventType = draft.source_type === "commitment_email" ? event.event_type : draft.event_type;
    const estimatedGuests =
      draft.source_type === "commitment_email" && draft.estimated_guests != null && /^\d+$/.test(draft.estimated_guests)
        ? applyCarriedReservePercent(Number(draft.estimated_guests), event.estimated_guests)
        : (draft.estimated_guests ?? event.estimated_guests);

    // Unlike a fresh import, a field the screenshot doesn't show keeps its saved value.
    const merged = {
      name,
      event_type: eventType as PrivateEventType,
      event_date: draft.event_date ?? event.event_date,
      start_time: draft.start_time ?? event.start_time,
      end_time: draft.end_time ?? event.end_time,
      contact_email: draft.contact_email ?? event.contact_email,
      contact_email_2: draft.contact_email_2 ?? event.contact_email_2,
      contact_phone: draft.contact_phone ?? event.contact_phone,
      contact_phone_2: draft.contact_phone_2 ?? event.contact_phone_2,
      estimated_guests: estimatedGuests,
    };
    const changedFields = (Object.keys(merged) as (keyof typeof merged)[]).filter((key) => merged[key] !== event[key]);

    const warnings = draft.warnings.map((w) =>
      w === "החילוץ מתמונה עלול לכלול טעויות - יש לבדוק את כל השדות בקפידה לפני יצירת האירוע."
        ? "החילוץ מתמונה עלול לכלול טעויות - יש לבדוק את כל השדות בקפידה לפני עדכון האירוע."
        : w,
    );

    const original = Object.fromEntries(
      (Object.keys(merged) as (keyof typeof merged)[]).map((key) => [key, (event[key] as string | null) ?? null]),
    );
    return { ...merged, warnings, changedFields, original };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "שגיאה בעיבוד התמונה" };
  }
}

export async function applyPrivateEventImageUpdate(eventId: string, draft: PrivateEventImageUpdateDraft) {
  const supabase = await createClient();

  const name = draft.name.trim();
  if (!name || !draft.event_type || !draft.event_date) throw new Error("שם, סוג אירוע ותאריך הם שדות חובה");

  const { error } = await supabase
    .from("private_events")
    .update({
      name,
      event_type: draft.event_type,
      event_date: draft.event_date,
      start_time: draft.start_time,
      end_time: draft.end_time,
      contact_email: draft.contact_email,
      contact_email_2: draft.contact_email_2,
      contact_phone: draft.contact_phone,
      contact_phone_2: draft.contact_phone_2,
      estimated_guests: draft.estimated_guests,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath("/private-events");
  revalidatePath(`/private-events/${eventId}`);
}
