"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { VENUE_SETTINGS_CACHE_TAG } from "@/lib/venueSettings";
import { VENUE_FILES_BUCKET } from "@/lib/welcomeAttachments";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function assertCanManage(): Promise<string | null> {
  const staff = await getCurrentStaff();
  return !staff || !canWrite(staff.permissions, "venue_settings") ? "אין הרשאה לשנות את הגדרות האולם" : null;
}

// Sets or replaces the venue logo. Returns an error message instead of throwing
// so the real text reaches the user. SVG is not accepted: it can carry scripts
// and would be served from this site's own address.
export async function uploadVenueLogo(formData: FormData): Promise<string | void> {
  const denied = await assertCanManage();
  if (denied) return denied;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return "יש לבחור קובץ";
  const ext = TYPES[file.type];
  if (!ext) return "ניתן להעלות תמונת PNG, JPG או WEBP בלבד";
  if (file.size > MAX_BYTES) return "התמונה גדולה מדי (עד 2MB)";

  const supabase = await createClient();
  const storage = createAdminClient().storage.from(VENUE_FILES_BUCKET);

  const path = `logo/logo-${Date.now()}.${ext}`;
  const { error: uploadError } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) return uploadError.message;

  const { data: old } = await supabase
    .from("venue_settings")
    .select("logo_path")
    .eq("id", true)
    .maybeSingle<{ logo_path: string | null }>();
  const { error } = await supabase.from("venue_settings").update({ logo_path: path }).eq("id", true);
  if (error) {
    await storage.remove([path]);
    return error.message;
  }
  if (old?.logo_path) await storage.remove([old.logo_path]);

  updateTag(VENUE_SETTINGS_CACHE_TAG);
  revalidatePath("/", "layout");
}

export async function removeVenueLogo(): Promise<string | void> {
  const denied = await assertCanManage();
  if (denied) return denied;

  const supabase = await createClient();
  const { data: old } = await supabase
    .from("venue_settings")
    .select("logo_path")
    .eq("id", true)
    .maybeSingle<{ logo_path: string | null }>();
  const { error } = await supabase.from("venue_settings").update({ logo_path: null }).eq("id", true);
  if (error) return error.message;
  if (old?.logo_path) await createAdminClient().storage.from(VENUE_FILES_BUCKET).remove([old.logo_path]);

  updateTag(VENUE_SETTINGS_CACHE_TAG);
  revalidatePath("/", "layout");
}
