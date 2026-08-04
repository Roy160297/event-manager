"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractMenuDraftFromDocx, type MenuImportDraft } from "@/lib/menuImport";
import { DEFAULT_MENUS } from "@/lib/defaultMenus";
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

// Called right after a new event is created, so wedding-type events start
// with the venue's standard tasting menu pre-filled instead of empty
// (mirrors applyDefaultSchedule) - buffet for the plain wedding types,
// plated for the "_service" (הגשה) variants. Other event types (bar/bat
// mitzvah, business events) don't have a tasting-menu template and are left
// without one, same as they're left without a default schedule.
export async function applyDefaultMenu(eventId: string, eventType: string) {
  const menuType: MenuType | null =
    eventType === "wedding" || eventType === "reverse_wedding"
      ? "buffet"
      : eventType === "wedding_service" || eventType === "reverse_wedding_service"
        ? "plated"
        : null;
  if (!menuType) return;

  const template = DEFAULT_MENUS[menuType];
  const supabase = await createClient();
  const { error } = await supabase.from("event_menus").insert({
    event_id: eventId,
    menu_type: template.menu_type,
    title: template.title,
    subtitle: template.subtitle,
    linens_note: template.linens_note,
    sections: template.sections,
    footer_notes: template.footer_notes,
  });
  if (error) throw new Error(error.message);
}
