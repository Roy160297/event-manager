"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";

async function assertCanManage() {
  const staff = await getCurrentStaff();
  if (!staff || !canWrite(staff.permissions, "admin")) throw new Error("אין הרשאה לשנות את הגדרות הסנכרון");
}

// The extension asks the site every ~15 minutes whether it is time to sync;
// this makes the next such question answer "yes".
export async function requestSyncNow() {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("iplan_sync_status").update({ run_requested_at: new Date().toISOString() }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/iplan");
}

// Master switch: while off, the site answers every extension request with "do
// not sync" and accepts nothing from it.
export async function setSyncEnabled(formData: FormData) {
  await assertCanManage();
  const supabase = await createClient();
  const { error } = await supabase.from("iplan_sync_status").update({ enabled: formData.get("enabled") === "on" }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/iplan");
}

export async function setSyncInterval(formData: FormData) {
  await assertCanManage();
  const minutes = Number(formData.get("interval_minutes"));
  if (![60, 120, 180, 360, 720, 1440].includes(minutes)) throw new Error("תדירות לא תקינה");
  const supabase = await createClient();
  const { error } = await supabase.from("iplan_sync_status").update({ interval_minutes: minutes }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/iplan");
}
