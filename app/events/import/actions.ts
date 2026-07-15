"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText, parsePdfDraft, type PdfImportDraft } from "@/lib/pdfImport";
import type { StaffRow } from "@/lib/types";

export async function addManagerFromImport(name: string): Promise<StaffRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("שם האחראי הוא שדה חובה");

  const supabase = await createClient();
  const { data, error } = await supabase.from("staff").insert({ name: trimmed }).select("*").single();
  if (error) throw new Error(error.message);
  return data as StaffRow;
}

export async function parsePdfImport(
  formData: FormData,
): Promise<PdfImportDraft & { matched_manager_id: string | null }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ PDF");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  const draft = parsePdfDraft(text);

  let matched_manager_id: string | null = null;
  if (draft.event_manager_name) {
    const supabase = await createClient();
    const { data: staff } = await supabase.from("staff").select("id, name").returns<StaffRow[]>();
    matched_manager_id =
      staff?.find((s) => s.name.trim().toLowerCase() === draft.event_manager_name!.trim().toLowerCase())?.id ??
      null;
  }

  return { ...draft, matched_manager_id };
}

export async function createEventFromPdfImport(
  draft: PdfImportDraft & { manager_id: string | null },
): Promise<{ eventId: string }> {
  const supabase = await createClient();

  const name = draft.name.trim();
  if (!name || !draft.event_type || !draft.event_date) {
    throw new Error("שם, סוג אירוע ותאריך הם שדות חובה");
  }

  const estimatedGuests =
    draft.guests_adults != null || draft.guests_children != null || draft.guests_reserve != null
      ? (draft.guests_adults ?? 0) + (draft.guests_children ?? 0) + (draft.guests_reserve ?? 0)
      : null;

  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      event_type: draft.event_type,
      event_date: draft.event_date,
      start_time: draft.start_time,
      end_time: draft.end_time,
      manager_id: draft.manager_id,
      estimated_guests: estimatedGuests,
      bride_name: draft.bride_name,
      groom_name: draft.groom_name,
      sales_person_name: draft.sales_person_name,
      service_style: draft.service_style,
      guests_adults: draft.guests_adults,
      guests_children: draft.guests_children,
      guests_reserve: draft.guests_reserve,
      bride_parents_names: draft.bride_parents_names,
      groom_parents_names: draft.groom_parents_names,
      menu_notes: draft.menu_notes,
      parking_notes: draft.parking_notes,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const eventId = data.id as string;

  if (draft.schedule.length > 0) {
    const rows = draft.schedule.map((item, index) => ({
      event_id: eventId,
      label: item.label,
      approx_time: item.approx_time,
      notes: null,
      sort_order: index,
    }));
    const { error: schedErr } = await supabase.from("timeline_items").insert(rows);
    if (schedErr) throw new Error(schedErr.message);
  }

  const validSuppliers = draft.suppliers.filter((s) => s.name.trim());
  if (validSuppliers.length > 0) {
    const rows = validSuppliers.map((s, index) => ({
      event_id: eventId,
      role: s.role,
      name: s.name.trim(),
      phone: s.phone,
      sort_order: index,
    }));
    const { error: supErr } = await supabase.from("event_suppliers").insert(rows);
    if (supErr) throw new Error(supErr.message);
  }

  revalidatePath("/");
  return { eventId };
}
