"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import type { MenuSaveData } from "@/app/events/[id]/menu/actions";
import type { MenuType } from "@/lib/types";

// Saves one of the venue's default menus (what an event's menu tab loads with a
// click, and what the AI import uses as the venue's format example). Returns an
// error message instead of throwing so the real text reaches the user.
export async function saveDefaultMenu(menuType: MenuType, menu: MenuSaveData): Promise<string | void> {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "venue_settings")) return "אין הרשאה לערוך את תפריטי ברירת המחדל";
  if (menuType !== "buffet" && menuType !== "plated") return "סוג תפריט לא תקין";

  const sections = menu.sections
    .map((section) => ({
      label: section.label.trim(),
      note: section.note?.trim() || null,
      items: section.items.map((item) => item.trim()).filter(Boolean),
    }))
    .filter((section) => section.label || section.items.length > 0);

  const supabase = await createClient();
  const { error } = await supabase.from("default_menus").upsert({
    menu_type: menuType,
    title: menu.title?.trim() || null,
    subtitle: menu.subtitle?.trim() || null,
    linens_note: menu.linens_note?.trim() || null,
    sections,
    footer_notes: menu.footer_notes.map((note) => note.trim()).filter(Boolean),
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;

  revalidatePath("/admin/menus");
}
