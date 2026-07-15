"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WaiterRole } from "@/lib/types";

export async function createWaiter(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "waiter") as WaiterRole;

  if (!name) throw new Error("שם המלצר הוא שדה חובה");

  const { error } = await supabase.from("waiters").insert({ name, phone, notes, role });
  if (error) throw new Error(error.message);

  revalidatePath("/waiters");
}

export async function updateWaiter(waiterId: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "waiter") as WaiterRole;

  if (!name) throw new Error("שם המלצר הוא שדה חובה");

  const { error } = await supabase.from("waiters").update({ name, phone, notes, role }).eq("id", waiterId);
  if (error) throw new Error(error.message);

  revalidatePath("/waiters");
}

export async function deleteWaiter(waiterId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waiters").delete().eq("id", waiterId);
  if (error) throw new Error(error.message);
  revalidatePath("/waiters");
}
