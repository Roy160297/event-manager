"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { GUIDE_KEYS } from "@/lib/guides";

// Every action returns an error message instead of throwing (Next.js hides thrown
// Server Action messages in production), and undefined on success.
type Result = Promise<string | void>;

const DENIED = "אין הרשאה לערוך את המדריכים";

async function allowed(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return !!staff && canWrite(staff.permissions, "venue_settings");
}

function refresh() {
  revalidatePath("/admin/guides");
  revalidatePath("/couple-meeting");
  revalidatePath("/event-management-dex");
}

// Moves a row one step up or down among its siblings, by rewriting the
// siblings' sort_order from their current order.
async function reorder(table: "guide_sections" | "guide_items", ids: string[], id: string, direction: "up" | "down"): Result {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  const ordered = [...ids];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  const supabase = await createClient();
  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase.from(table).update({ sort_order: (i + 1) * 10 }).eq("id", ordered[i]);
    if (error) return error.message;
  }
}

export async function updateIntro(pageKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  if (!(GUIDE_KEYS as readonly string[]).includes(pageKey)) return "מדריך לא מוכר";
  const supabase = await createClient();
  const { error } = await supabase
    .from("guide_pages")
    .update({ intro: String(formData.get("intro") ?? "").trim() })
    .eq("key", pageKey);
  if (error) return error.message;
  refresh();
}

export async function addSection(pageKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "יש להזין שם לקטגוריה";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("guide_sections")
    .select("sort_order")
    .eq("page_key", pageKey)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("guide_sections").insert({ page_key: pageKey, label, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return error.message;
  refresh();
}

export async function renameSection(sectionId: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "שם הקטגוריה הוא שדה חובה";
  const supabase = await createClient();
  const { error } = await supabase.from("guide_sections").update({ label }).eq("id", sectionId);
  if (error) return error.message;
  refresh();
}

export async function moveSection(pageKey: string, sectionId: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("guide_sections").select("id").eq("page_key", pageKey).order("sort_order");
  const error = await reorder("guide_sections", (data ?? []).map((row) => row.id as string), sectionId, direction);
  if (error) return error;
  refresh();
}

export async function deleteSection(sectionId: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("guide_sections").delete().eq("id", sectionId);
  if (error) return error.message;
  refresh();
}

export async function addItem(sectionId: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return "יש להזין את נוסח הסעיף";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("guide_items")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("guide_items").insert({ section_id: sectionId, text, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return error.message;
  refresh();
}

export async function updateItem(itemId: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return "נוסח הסעיף לא יכול להיות ריק";
  const supabase = await createClient();
  const { error } = await supabase.from("guide_items").update({ text }).eq("id", itemId);
  if (error) return error.message;
  refresh();
}

export async function moveItem(sectionId: string, itemId: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("guide_items").select("id").eq("section_id", sectionId).order("sort_order");
  const error = await reorder("guide_items", (data ?? []).map((row) => row.id as string), itemId, direction);
  if (error) return error;
  refresh();
}

export async function deleteItem(itemId: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("guide_items").delete().eq("id", itemId);
  if (error) return error.message;
  refresh();
}
