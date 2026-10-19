"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { VENUE_FILES_BUCKET, type WelcomeAttachmentRow } from "@/lib/welcomeAttachments";

const MAX_BYTES = 8 * 1024 * 1024;

async function assertCanManage(): Promise<string | null> {
  const staff = await getCurrentStaff();
  return !staff || !canWrite(staff.permissions, "venue_settings") ? "אין הרשאה לשנות את הגדרות האולם" : null;
}

// Sets (or replaces) the PDF attached to the welcome email: for one staff
// member when staff_id is given, otherwise the venue's default file. Returns
// an error message instead of throwing so the real text reaches the user.
export async function uploadWelcomeAttachment(formData: FormData): Promise<string | void> {
  const denied = await assertCanManage();
  if (denied) return denied;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return "יש לבחור קובץ";
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return "ניתן להעלות קובץ PDF בלבד";
  if (file.size > MAX_BYTES) return "הקובץ גדול מדי (עד 8MB)";

  const staffId = String(formData.get("staff_id") ?? "").trim() || null;

  const supabase = await createClient();
  const storage = createAdminClient().storage.from(VENUE_FILES_BUCKET);

  const path = `welcome-email/${staffId ?? "default"}-${Date.now()}.pdf`;
  const { error: uploadError } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: "application/pdf",
  });
  if (uploadError) return uploadError.message;

  // At most one default and one per staff member (unique index), so a match
  // here is the file being replaced.
  const { data: rows } = await supabase
    .from("welcome_email_attachments")
    .select("id, staff_id, file_path")
    .returns<Pick<WelcomeAttachmentRow, "id" | "staff_id" | "file_path">[]>();
  const old = rows?.find((row) => row.staff_id === staffId);

  if (old) {
    const { error } = await supabase
      .from("welcome_email_attachments")
      .update({ file_path: path, file_name: file.name })
      .eq("id", old.id);
    if (error) {
      await storage.remove([path]);
      return error.message;
    }
    await storage.remove([old.file_path]);
  } else {
    const { error } = await supabase
      .from("welcome_email_attachments")
      .insert({ staff_id: staffId, file_path: path, file_name: file.name });
    if (error) {
      await storage.remove([path]);
      return error.message;
    }
  }

  revalidatePath("/admin/venue");
}

export async function deleteWelcomeAttachment(id: string): Promise<string | void> {
  const denied = await assertCanManage();
  if (denied) return denied;

  const supabase = await createClient();
  const { data } = await supabase
    .from("welcome_email_attachments")
    .select("file_path")
    .eq("id", id)
    .maybeSingle<{ file_path: string }>();
  const { error } = await supabase.from("welcome_email_attachments").delete().eq("id", id);
  if (error) return error.message;
  if (data) await createAdminClient().storage.from(VENUE_FILES_BUCKET).remove([data.file_path]);

  revalidatePath("/admin/venue");
}
