"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES } from "@/lib/permissions";

export async function createRole(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("שם התפקיד הוא שדה חובה");

  const { data: role, error } = await supabase.from("roles").insert({ name }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? `כבר קיים תפקיד בשם "${name}"` : error.message);

  const { error: permError } = await supabase
    .from("role_permissions")
    .insert(RESOURCES.map((resource) => ({ role_id: role.id, resource, can_read: false, can_write: false })));
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
}

export async function deleteRole(roleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
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
    .update({ [field]: value })
    .eq("role_id", roleId)
    .eq("resource", resource);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
}
