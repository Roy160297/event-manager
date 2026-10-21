"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractMenuDraftFromDocx, type MenuImportDraft } from "@/lib/menuImport";
import { loadDefaultMenus } from "@/lib/defaultMenus";
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
  const examples = await loadDefaultMenus(await createClient()).catch(() => []);
  return extractMenuDraftFromDocx(buffer, examples);
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

// Loads one of the venue's default menus into the event (replacing its menu).
// Triggered by hand from the menu tab - a new event starts without a menu.
export async function loadDefaultMenu(eventId: string, menuType: MenuType) {
  const supabase = await createClient();
  const template = (await loadDefaultMenus(supabase)).find((menu) => menu.menu_type === menuType);
  if (!template) throw new Error("לא נמצא תפריט ברירת מחדל מהסוג הזה");

  const { error } = await supabase.from("event_menus").upsert({
    event_id: eventId,
    menu_type: template.menu_type,
    title: template.title,
    subtitle: template.subtitle,
    linens_note: template.linens_note,
    sections: template.sections,
    footer_notes: template.footer_notes,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/menu`);
}
