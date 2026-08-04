"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractMenuDraftFromDocx, type MenuImportDraft } from "@/lib/menuImport";
import type { MenuSection, MenuType } from "@/lib/types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function parseMenuImport(formData: FormData): Promise<MenuImportDraft> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ Word");
  }
  const isDocx = file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
  if (!isDocx) {
    throw new Error("יש להעלות קובץ Word בפורמט docx בלבד");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return extractMenuDraftFromDocx(buffer);
}

export interface MenuSaveData {
  menu_type: MenuType;
  title: string | null;
  subtitle: string | null;
  linens_note: string | null;
  sections: MenuSection[];
  footer_notes: string[];
}

export async function saveMenu(eventId: string, menu: MenuSaveData) {
  const supabase = await createClient();

  const sections = menu.sections
    .map((section) => ({
      label: section.label.trim(),
      note: section.note?.trim() || null,
      items: section.items.map((item) => item.trim()).filter(Boolean),
    }))
    .filter((section) => section.label || section.items.length > 0);

  const { error } = await supabase.from("event_menus").upsert({
    event_id: eventId,
    menu_type: menu.menu_type,
    title: menu.title?.trim() || null,
    subtitle: menu.subtitle?.trim() || null,
    linens_note: menu.linens_note?.trim() || null,
    sections,
    footer_notes: menu.footer_notes.map((note) => note.trim()).filter(Boolean),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/menu`);
}

export async function deleteMenu(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_menus").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/menu`);
}
