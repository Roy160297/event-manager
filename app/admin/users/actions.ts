"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addStaff(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const roleId = String(formData.get("role_id") ?? "").trim() || null;

  if (!name) throw new Error("שם הוא שדה חובה");
  if (!email) throw new Error("כתובת אימייל היא שדה חובה כדי לאפשר התחברות");

  const { error } = await supabase.from("staff").insert({ name, email, phone, role_id: roleId });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function updateStaffDetails(staffId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) throw new Error("שם הוא שדה חובה");
  if (!email) throw new Error("כתובת אימייל היא שדה חובה כדי לאפשר התחברות");

  const { error } = await supabase.from("staff").update({ name, email, phone }).eq("id", staffId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function updateStaffRole(staffId: string, roleId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ role_id: roleId || null })
    .eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function removeStaff(staffId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}
