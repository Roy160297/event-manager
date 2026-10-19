import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getEventManagerCandidates } from "@/lib/staff";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { VENUE_FILES_BUCKET, type WelcomeAttachmentRow } from "@/lib/welcomeAttachments";
import { deleteWelcomeAttachment, uploadWelcomeAttachment } from "./attachmentActions";

// The PDFs attached to the opening email: one default plus, optionally, one per
// event manager (each manager's guidelines can differ). The sender's own file is
// used when they have one, otherwise the default.
export async function WelcomeAttachments({ canEdit }: { canEdit: boolean }) {
  const supabase = await createClient();
  const [{ data: rows }, managers] = await Promise.all([
    supabase.from("welcome_email_attachments").select("id, staff_id, file_path, file_name").returns<WelcomeAttachmentRow[]>(),
    getEventManagerCandidates(),
  ]);

  const storage = createAdminClient().storage.from(VENUE_FILES_BUCKET);
  const items = await Promise.all(
    (rows ?? []).map(async (row) => ({
      ...row,
      url: (await storage.createSignedUrl(row.file_path, 60 * 60)).data?.signedUrl ?? null,
    })),
  );

  const defaultRow = items.find((row) => row.staff_id === null) ?? null;
  const managerRows = items.filter((row) => row.staff_id !== null);
  const nameById = new Map(managers.map((manager) => [manager.id, manager.name]));
  const managersWithoutFile = managers.filter((manager) => !managerRows.some((row) => row.staff_id === manager.id));

  const fileInput = "text-sm file:me-3 file:rounded-full file:border file:border-border-classic file:bg-background file:px-3 file:py-1.5 file:text-sm";

  function row(label: string, item: (typeof items)[number] | null, staffId: string) {
    async function remove() {
      "use server";
      if (item) await deleteWelcomeAttachment(item.id);
    }
    return (
      <li key={staffId || "default"} className="flex flex-col gap-2 border-t border-border-classic pt-3 first:border-0 first:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="font-medium">{label}: </span>
            {item ? (
              item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {item.file_name}
                </a>
              ) : (
                item.file_name
              )
            ) : (
              <span className="text-foreground/60">אין קובץ</span>
            )}
          </p>
          {canEdit && item && (
            <form action={remove}>
              <ConfirmSubmitButton
                message={`להסיר את הקובץ של ${label}?`}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
                הסר
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
        {canEdit && (
          <SaveDetailsForm
            action={uploadWelcomeAttachment}
            message="הקובץ הועלה בהצלחה"
            clearOnSuccess
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="staff_id" value={staffId} />
            <input type="file" name="file" accept="application/pdf,.pdf" required className={fileInput} />
            <button
              type="submit"
              className="rounded-full border border-accent px-4 py-1.5 text-sm text-accent hover:bg-accent-soft"
            >
              {item ? "החלף קובץ" : "העלה קובץ"}
            </button>
          </SaveDetailsForm>
        )}
      </li>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <p className="font-serif text-lg font-bold">קבצי PDF למייל הפתיחה</p>
      <p className="text-xs text-foreground/60">
        קובץ ברירת המחדל נשלח כשלמנהל האירוע אין קובץ משלו. אפשר להוסיף קובץ נפרד לכל מנהל אירוע, ובזמן השליחה אפשר גם להחליף קובץ
        חד-פעמית.
      </p>
      <ul className="flex flex-col gap-3">
        {row("ברירת מחדל", defaultRow, "")}
        {managerRows.map((item) => row(nameById.get(item.staff_id!) ?? "מנהל אירוע", item, item.staff_id!))}
      </ul>

      {canEdit && managersWithoutFile.length > 0 && (
        <SaveDetailsForm
          action={uploadWelcomeAttachment}
          message="הקובץ הועלה בהצלחה"
          clearOnSuccess
          className="flex flex-col gap-2 border-t border-border-classic pt-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">קובץ נפרד למנהל אירוע</span>
            <select name="staff_id" required defaultValue="" className="rounded-md border border-border-classic bg-surface px-3 py-2">
              <option value="" disabled>
                בחרו מנהל/ת אירוע
              </option>
              {managersWithoutFile.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>
          <input type="file" name="file" accept="application/pdf,.pdf" required className={fileInput} />
          <button
            type="submit"
            className="rounded-full border border-accent px-4 py-1.5 text-sm text-accent hover:bg-accent-soft"
          >
            הוסף
          </button>
        </SaveDetailsForm>
      )}
    </section>
  );
}
