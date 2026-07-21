"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractEventDraftFromImage, type ImageImportDraft } from "@/lib/imageImport";
import { getCurrentStaff } from "@/lib/auth";
import { applyDefaultSchedule } from "@/app/events/[id]/timeline/actions";
import type { StaffRow } from "@/lib/types";

export async function parseImageImport(
  formData: FormData,
): Promise<ImageImportDraft & { matched_manager_id: string | null }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("הקובץ שנבחר אינו תמונה");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const draft = await extractEventDraftFromImage(buffer, file.type);

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

export async function createEventFromImageImport(
  draft: ImageImportDraft & { manager_id: string | null },
): Promise<{ eventId: string }> {
  const supabase = await createClient();

  const name = draft.name.trim();
  if (!name || !draft.event_type || !draft.event_date) {
    throw new Error("שם, סוג אירוע ותאריך הם שדות חובה");
  }

  let managerId = draft.manager_id;
  if (!managerId) {
    const currentStaff = await getCurrentStaff();
    managerId = currentStaff?.id ?? null;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      name,
      event_type: draft.event_type,
      event_date: draft.event_date,
      start_time: draft.start_time || "19:30",
      end_time: draft.end_time || "03:00",
      manager_id: managerId,
      estimated_guests: draft.estimated_guests,
      bride_name: draft.bride_name,
      groom_name: draft.groom_name,
      sales_person_name: draft.sales_person_name,
      service_style: draft.service_style,
      contact_phone: draft.contact_phone,
      contact_phone_2: draft.contact_phone_2,
      contact_email: draft.contact_email,
      contact_email_2: draft.contact_email_2,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const eventId = data.id as string;

  await applyDefaultSchedule(eventId, draft.event_type);

  revalidatePath("/");
  return { eventId };
}
