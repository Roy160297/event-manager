import { createAdminClient } from "@/lib/supabase/admin";

export const VENUE_FILES_BUCKET = "venue-files";

export interface WelcomeAttachmentRow {
  id: string;
  staff_id: string | null;
  file_path: string;
  file_name: string;
}

// The file to attach for a given sender: their own if they have one, otherwise
// the venue's default, otherwise none. Server-only (service-role client): the
// bucket has no public access.
export async function findWelcomeAttachment(senderStaffId: string | null): Promise<WelcomeAttachmentRow | null> {
  const { data } = await createAdminClient()
    .from("welcome_email_attachments")
    .select("id, staff_id, file_path, file_name")
    .returns<WelcomeAttachmentRow[]>();
  const rows = data ?? [];
  return (senderStaffId ? rows.find((row) => row.staff_id === senderStaffId) : undefined) ?? rows.find((row) => row.staff_id === null) ?? null;
}

export async function downloadWelcomeAttachment(row: WelcomeAttachmentRow): Promise<string> {
  const { data, error } = await createAdminClient().storage.from(VENUE_FILES_BUCKET).download(row.file_path);
  if (error || !data) throw new Error("לא ניתן לקרוא את הקובץ המצורף מהאחסון");
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}
