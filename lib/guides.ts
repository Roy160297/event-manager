import type { SupabaseClient } from "@supabase/supabase-js";

// The two guide pages whose text the venue edits (see the guide_* tables).
export const GUIDE_KEYS = ["couple_meeting", "event_management_dex"] as const;
export type GuideKey = (typeof GUIDE_KEYS)[number];

export interface GuideItem {
  id: string;
  text: string;
}

export interface GuideSection {
  id: string;
  label: string;
  items: GuideItem[];
}

export interface Guide {
  key: string;
  title: string;
  intro: string;
  sections: GuideSection[];
}

interface PageRow {
  key: string;
  title: string;
  intro: string;
  sort_order: number;
}
interface SectionRow {
  id: string;
  page_key: string;
  label: string;
  sort_order: number;
}
interface ItemRow {
  id: string;
  section_id: string;
  text: string;
  sort_order: number;
}

// Pure assembly of the three tables, everything in the venue's chosen order.
export function assembleGuides(pages: PageRow[], sections: SectionRow[], items: ItemRow[]): Guide[] {
  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  return [...pages].sort(bySort).map((page) => ({
    key: page.key,
    title: page.title,
    intro: page.intro,
    sections: sections
      .filter((section) => section.page_key === page.key)
      .sort(bySort)
      .map((section) => ({
        id: section.id,
        label: section.label,
        items: items
          .filter((item) => item.section_id === section.id)
          .sort(bySort)
          .map((item) => ({ id: item.id, text: item.text })),
      })),
  }));
}

export async function loadGuides(supabase: SupabaseClient): Promise<Guide[]> {
  const [pages, sections, items] = await Promise.all([
    supabase.from("guide_pages").select("key, title, intro, sort_order"),
    supabase.from("guide_sections").select("id, page_key, label, sort_order"),
    supabase.from("guide_items").select("id, section_id, text, sort_order"),
  ]);
  const error = pages.error ?? sections.error ?? items.error;
  if (error) throw new Error(error.message);
  return assembleGuides(pages.data as PageRow[], sections.data as SectionRow[], items.data as ItemRow[]);
}

export async function loadGuide(supabase: SupabaseClient, key: GuideKey): Promise<Guide | null> {
  return (await loadGuides(supabase)).find((guide) => guide.key === key) ?? null;
}
