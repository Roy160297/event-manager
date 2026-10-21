"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { permissionResourceList } from "@/lib/permissions";
import { getChecklists } from "@/lib/checklists";
import { EVENT_MANAGERS_CACHE_TAG, FLOOR_MANAGERS_CACHE_TAG, SALESPEOPLE_CACHE_TAG } from "@/lib/staff";

export async function createRole(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("שם התפקיד הוא שדה חובה");

  const { data: role, error } = await supabase.from("roles").insert({ name }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? `כבר קיים תפקיד בשם "${name}"` : error.message);

  const { error: permError } = await supabase
    .from("role_permissions")
    .insert(
      permissionResourceList(await getChecklists()).map(({ key: resource }) => ({
        role_id: role.id,
        resource,
        can_read: false,
        can_write: false,
      })),
    );
  if (permError) throw new Error(permError.message);

  revalidatePath("/admin/roles");
}

export async function renameRole(roleId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("שם התפקיד הוא שדה חובה");

  const { error } = await supabase.from("roles").update({ name }).eq("id", roleId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
  updateTag(FLOOR_MANAGERS_CACHE_TAG);
  updateTag(SALESPEOPLE_CACHE_TAG);
}

export async function deleteRole(roleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  updateTag(EVENT_MANAGERS_CACHE_TAG);
  updateTag(FLOOR_MANAGERS_CACHE_TAG);
  updateTag(SALESPEOPLE_CACHE_TAG);
}

const ROLE_FLAGS = {
  can_be_event_manager: EVENT_MANAGERS_CACHE_TAG,
  can_be_floor_manager: FLOOR_MANAGERS_CACHE_TAG,
  can_be_salesperson: SALESPEOPLE_CACHE_TAG,
} as const;
export type RoleFlag = keyof typeof ROLE_FLAGS;

// Whether people with this role appear in the event manager / floor manager /
// salesperson dropdowns.
export async function setRoleFlag(roleId: string, flag: RoleFlag, value: boolean) {
  if (!(flag in ROLE_FLAGS)) throw new Error("הגדרה לא מוכרת");
  const supabase = await createClient();
  const { error } = await supabase.from("roles").update({ [flag]: value }).eq("id", roleId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
  updateTag(ROLE_FLAGS[flag]);
}

export async function setRolePermission(
  roleId: string,
  resource: string,
  field: "can_read" | "can_write",
  value: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert({ role_id: roleId, resource, [field]: value }, { onConflict: "role_id,resource", ignoreDuplicates: false });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
}
