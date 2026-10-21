import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuSection, MenuType } from "@/lib/types";

// The venue's standard tasting menus (buffet / plated), kept in the
// default_menus table and edited at /admin/menus. An event's menu tab can load
// one with a click, and the AI import of an event's own menu document uses them
// as the example of the venue's format.
export interface DefaultMenu {
  menu_type: MenuType;
  title: string | null;
  subtitle: string | null;
  linens_note: string | null;
  sections: MenuSection[];
  footer_notes: string[];
}

export async function loadDefaultMenus(supabase: SupabaseClient): Promise<DefaultMenu[]> {
  const { data, error } = await supabase
    .from("default_menus")
    .select("menu_type, title, subtitle, linens_note, sections, footer_notes")
    .order("menu_type");
  if (error) throw new Error(error.message);
  return (data ?? []) as DefaultMenu[];
}
