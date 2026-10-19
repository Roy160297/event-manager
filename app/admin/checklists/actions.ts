"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { CHECKLISTS_CACHE_TAG, CLOSING_CHECKLIST_KEY } from "@/lib/checklists";
import { EVENT_TYPE_LABELS } from "@/lib/labels";

// Every action returns an error message instead of throwing (Next.js hides thrown
// Server Action messages in production), and undefined on success.
type Result = Promise<string | void>;

const DENIED = "אין הרשאה לערוך צ'קליסטים";
const randomKey = (prefix: string) => `${prefix}_${randomBytes(4).toString("hex")}`;

async function allowed(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return !!staff && canWrite(staff.permissions, "venue_settings");
}

function refresh() {
  updateTag(CHECKLISTS_CACHE_TAG);
  revalidatePath("/", "layout");
}

// Moves the row with `key` one step up or down among its siblings, by rewriting
// the siblings' sort_order from their current order.
async function reorder(
  table: "checklists" | "checklist_categories" | "checklist_items",
  siblings: { id: string; key: string }[],
  key: string,
  direction: "up" | "down",
): Promise<string | void> {
  const index = siblings.findIndex((row) => row.key === key);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  const ordered = [...siblings];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  const supabase = await createClient();
  for (let i = 0; i < ordered.length; i++) {
    const idColumn = table === "checklists" ? "key" : "id";
    const idValue = table === "checklists" ? ordered[i].key : ordered[i].id;
    const { error } = await supabase.from(table).update({ sort_order: (i + 1) * 10 }).eq(idColumn, idValue);
    if (error) return error.message;
  }
}

// ---- checklists

export async function createChecklist(formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "יש להזין שם לצ'קליסט";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("checklists")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const key = randomKey("cl");
  const { error } = await supabase.from("checklists").insert({
    key,
    label,
    note_label: "הערות",
    requires_manager_cosign: true,
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (error) return error.message;

  const { error: categoryError } = await supabase
    .from("checklist_categories")
    .insert({ checklist_key: key, key: randomKey("c"), label, sort_order: 10 });
  if (categoryError) return categoryError.message;

  // The checklist is also a permission resource. Roles start with no access,
  // except the ones that may edit checklists, so its creators can see it at once.
  const admin = createAdminClient();
  const [{ data: roles }, { data: editors }] = await Promise.all([
    admin.from("roles").select("id"),
    admin.from("role_permissions").select("role_id").eq("resource", "venue_settings").eq("can_write", true),
  ]);
  const editorRoleIds = new Set((editors ?? []).map((row) => row.role_id));
  const { error: permError } = await admin.from("role_permissions").insert(
    (roles ?? []).map((role) => ({
      role_id: role.id,
      resource: key,
      can_read: editorRoleIds.has(role.id),
      can_write: editorRoleIds.has(role.id),
    })),
  );
  if (permError) return permError.message;

  refresh();
}

export async function updateChecklist(key: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "שם הצ'קליסט הוא שדה חובה";

  const hasNotes = formData.get("has_notes") === "on";
  const noteLabel = String(formData.get("note_label") ?? "").trim();
  if (hasNotes && !noteLabel) return "יש להזין כותרת לתיבת ההערות או לבטל אותה";

  const validTypes = Object.keys(EVENT_TYPE_LABELS);
  const types = formData.getAll("event_types").map(String).filter((type) => validTypes.includes(type));

  const supabase = await createClient();
  const { error } = await supabase
    .from("checklists")
    .update({
      label,
      note_label: hasNotes ? noteLabel : null,
      // Nothing ticked (or everything ticked) means the checklist applies to every type.
      event_types: types.length === 0 || types.length === validTypes.length ? null : types,
      show_category_labels: formData.get("show_category_labels") === "on",
      include_in_email: formData.get("include_in_email") === "on",
      requires_manager_cosign: formData.get("requires_manager_cosign") === "on",
    })
    .eq("key", key);
  if (error) return error.message;

  refresh();
}

export async function moveChecklist(key: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("checklists").select("key").order("sort_order");
  const error = await reorder("checklists", (data ?? []).map((row) => ({ id: row.key, key: row.key })), key, direction);
  if (error) return error;
  refresh();
}

export async function deleteChecklist(key: string): Result {
  if (!(await allowed())) return DENIED;
  if (key === CLOSING_CHECKLIST_KEY) return "אי אפשר למחוק את הצ'קליסט של מנהל האירוע";

  // Service role: the data being cleaned up belongs to roles the editor may not hold.
  const admin = createAdminClient();
  const { data: photos } = await admin.from("checklist_photos").select("storage_path").eq("checklist_key", key);
  if (photos && photos.length > 0) {
    await admin.storage.from("checklist-photos").remove(photos.map((photo) => photo.storage_path));
  }
  for (const table of ["checklist_photos", "checklist_signatures", "role_checklist_checks", "role_checklist_notes"] as const) {
    const { error } = await admin.from(table).delete().eq("checklist_key", key);
    if (error) return error.message;
  }
  const { error: permError } = await admin.from("role_permissions").delete().eq("resource", key);
  if (permError) return permError.message;

  const { error } = await admin.from("checklists").delete().eq("key", key);
  if (error) return error.message;

  refresh();
}

// ---- categories

export async function addCategory(checklistKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "יש להזין שם לקטגוריה";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("checklist_categories")
    .select("sort_order")
    .eq("checklist_key", checklistKey)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase
    .from("checklist_categories")
    .insert({ checklist_key: checklistKey, key: randomKey("c"), label, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return error.message;
  refresh();
}

export async function renameCategory(checklistKey: string, categoryKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "שם הקטגוריה הוא שדה חובה";
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_categories")
    .update({ label })
    .eq("checklist_key", checklistKey)
    .eq("key", categoryKey);
  if (error) return error.message;
  refresh();
}

export async function moveCategory(checklistKey: string, categoryKey: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_categories")
    .select("id, key")
    .eq("checklist_key", checklistKey)
    .order("sort_order");
  const error = await reorder("checklist_categories", data ?? [], categoryKey, direction);
  if (error) return error;
  refresh();
}

// Removes the marks that pointed at items which no longer exist.
async function deleteMarks(checklistKey: string, itemKeys: string[]): Promise<string | void> {
  if (itemKeys.length === 0) return;
  const admin = createAdminClient();
  const query =
    checklistKey === CLOSING_CHECKLIST_KEY
      ? admin.from("closing_checklist_checks").delete().in("item_key", itemKeys)
      : admin.from("role_checklist_checks").delete().eq("checklist_key", checklistKey).in("item_key", itemKeys);
  const { error } = await query;
  if (error) return error.message;
}

export async function deleteCategory(checklistKey: string, categoryKey: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("checklist_categories")
    .select("id")
    .eq("checklist_key", checklistKey)
    .eq("key", categoryKey)
    .maybeSingle<{ id: string }>();
  if (!category) return;

  const { data: items } = await supabase.from("checklist_items").select("key").eq("category_id", category.id);
  const { error } = await supabase.from("checklist_categories").delete().eq("id", category.id);
  if (error) return error.message;
  const cleanupError = await deleteMarks(checklistKey, (items ?? []).map((item) => item.key));
  if (cleanupError) return cleanupError;
  refresh();
}

// ---- items

export async function addItem(checklistKey: string, categoryKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return "יש להזין את נוסח הסעיף";

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("checklist_categories")
    .select("id")
    .eq("checklist_key", checklistKey)
    .eq("key", categoryKey)
    .maybeSingle<{ id: string }>();
  if (!category) return "הקטגוריה לא נמצאה";

  const { data: last } = await supabase
    .from("checklist_items")
    .select("sort_order")
    .eq("category_id", category.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("checklist_items").insert({
    category_id: category.id,
    checklist_key: checklistKey,
    key: randomKey("i"),
    text,
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (error) return error.message;
  refresh();
}

export async function updateItem(checklistKey: string, itemKey: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return "נוסח הסעיף לא יכול להיות ריק";
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").update({ text }).eq("checklist_key", checklistKey).eq("key", itemKey);
  if (error) return error.message;
  refresh();
}

export async function moveItem(checklistKey: string, itemKey: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("checklist_items")
    .select("category_id")
    .eq("checklist_key", checklistKey)
    .eq("key", itemKey)
    .maybeSingle<{ category_id: string }>();
  if (!item) return;
  const { data } = await supabase
    .from("checklist_items")
    .select("id, key")
    .eq("category_id", item.category_id)
    .order("sort_order");
  const error = await reorder("checklist_items", data ?? [], itemKey, direction);
  if (error) return error;
  refresh();
}

export async function deleteItem(checklistKey: string, itemKey: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("checklist_key", checklistKey).eq("key", itemKey);
  if (error) return error.message;
  const cleanupError = await deleteMarks(checklistKey, [itemKey]);
  if (cleanupError) return cleanupError;
  refresh();
}
