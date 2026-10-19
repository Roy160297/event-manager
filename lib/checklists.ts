import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventType } from "@/lib/types";

export const CHECKLISTS_CACHE_TAG = "checklists";

// The event manager's own checklist keeps its own storage tables (and cannot be
// deleted); every other checklist stores its marks in role_checklist_checks.
export const CLOSING_CHECKLIST_KEY = "closing_checklist";

export interface ChecklistItem {
  key: string;
  text: string;
}

export interface ChecklistCategory {
  key: string;
  label: string;
  items: ChecklistItem[];
}

// One closing checklist as the venue defined it (see the checklists tables).
export interface ChecklistDefinition {
  key: string;
  label: string;
  // Label of the free-text box under the list; null means the checklist has none.
  noteLabel: string | null;
  // Event types it applies to; null means every type.
  eventTypes: EventType[] | null;
  showCategoryLabels: boolean;
  // Sent by email together with the event summary report.
  includeInEmail: boolean;
  // The event manager co-signs after the role holder signs.
  requiresManagerCosign: boolean;
  isSystem: boolean;
  sortOrder: number;
  categories: ChecklistCategory[];
}

interface ChecklistRow {
  key: string;
  label: string;
  note_label: string | null;
  event_types: string[] | null;
  show_category_labels: boolean;
  include_in_email: boolean;
  requires_manager_cosign: boolean;
  is_system: boolean;
  sort_order: number;
}
interface CategoryRow {
  id: string;
  checklist_key: string;
  key: string;
  label: string;
  sort_order: number;
}
interface ItemRow {
  category_id: string;
  key: string;
  text: string;
  sort_order: number;
}

// Pure assembly of the three tables into definitions - kept apart from the
// query so it can be tested without a database.
export function assembleChecklists(checklists: ChecklistRow[], categories: CategoryRow[], items: ItemRow[]): ChecklistDefinition[] {
  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  return [...checklists].sort(bySort).map((checklist) => ({
    key: checklist.key,
    label: checklist.label,
    noteLabel: checklist.note_label,
    eventTypes: checklist.event_types as EventType[] | null,
    showCategoryLabels: checklist.show_category_labels,
    includeInEmail: checklist.include_in_email,
    requiresManagerCosign: checklist.requires_manager_cosign,
    isSystem: checklist.is_system,
    sortOrder: checklist.sort_order,
    categories: categories
      .filter((category) => category.checklist_key === checklist.key)
      .sort(bySort)
      .map((category) => ({
        key: category.key,
        label: category.label,
        items: items
          .filter((item) => item.category_id === category.id)
          .sort(bySort)
          .map((item) => ({ key: item.key, text: item.text })),
      })),
  }));
}

// All checklists with their categories and items. Read with the service-role
// client (nothing here is sensitive) so it can be cached across requests; the
// editor refreshes it by tag. A failed read throws, so a failure is never cached.
export const getChecklists = unstable_cache(
  async (): Promise<ChecklistDefinition[]> => {
    const supabase = createAdminClient();
    const [checklists, categories, items] = await Promise.all([
      supabase.from("checklists").select("key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order"),
      supabase.from("checklist_categories").select("id, checklist_key, key, label, sort_order"),
      supabase.from("checklist_items").select("category_id, key, text, sort_order"),
    ]);
    const error = checklists.error ?? categories.error ?? items.error;
    if (error) throw new Error(error.message);
    return assembleChecklists(checklists.data as ChecklistRow[], categories.data as CategoryRow[], items.data as ItemRow[]);
  },
  ["checklists"],
  { tags: [CHECKLISTS_CACHE_TAG] },
);

export function findChecklist(checklists: ChecklistDefinition[], key: string): ChecklistDefinition | undefined {
  return checklists.find((checklist) => checklist.key === key);
}

export function itemKeysOf(checklist: Pick<ChecklistDefinition, "categories">): string[] {
  return checklist.categories.flatMap((category) => category.items.map((item) => item.key));
}

export function countItems(categories: ChecklistCategory[]): number {
  return categories.reduce((sum, category) => sum + category.items.length, 0);
}

// Whether a checklist applies to an event of the given type.
export function appliesToEventType(checklist: Pick<ChecklistDefinition, "eventTypes">, eventType: EventType | null): boolean {
  return !checklist.eventTypes || (!!eventType && checklist.eventTypes.includes(eventType));
}
