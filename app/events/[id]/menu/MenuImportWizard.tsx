"use client";

import { useRef, useState } from "react";
import { parseMenuImport } from "./actions";
import { DocxDropZone } from "@/components/DocxDropZone";
import { MenuEditor, type EditableMenu } from "./MenuEditor";
import type { MenuImportDraft } from "@/lib/menuImport";

function draftToEditable(draft: MenuImportDraft): EditableMenu {
  return {
    menu_type: draft.menu_type,
    title: draft.title ?? "",
    subtitle: draft.subtitle ?? "",
    linens_note: draft.linens_note ?? "",
    sections:
      draft.sections.length > 0
        ? draft.sections.map((s) => ({ label: s.label, note: s.note ?? "", items: s.items.length > 0 ? s.items : [""] }))
        : [{ label: "", note: "", items: [""] }],
    footer_notes: draft.footer_notes,
  };
}

export function MenuImportWizard({
  eventId,
  onCancel,
  onSaved,
}: {
  eventId: string;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<MenuImportDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCancelReview() {
    // Going back to the upload step reuses this same component instance
    // (only the JSX branch changes), so state like fileName isn't reset on
    // its own - without this the dropzone would keep showing the previously
    // picked file name even though the underlying <input> is now empty.
    setDraft(null);
    setFileName(null);
    setError(null);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    try {
      const result = await parseMenuImport(formData);
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  if (!draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
      >
        <p className="text-sm font-medium">ייבוא תפריט מקובץ Word</p>
        <DocxDropZone fileInputRef={fileInputRef} fileName={fileName} onFileName={setFileName} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !fileName}
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "מעבד..." : "ייבוא"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm text-foreground/60 hover:underline">
              ביטול
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
      <p className="font-serif text-lg font-bold">בדיקת התפריט לפני שמירה</p>
      <p className="text-sm text-foreground/60">
        התפריט זוהה אוטומטית כ&quot;{draft.menu_type === "plated" ? "הגשה" : "מזנונים"}&quot; - אפשר לשנות זאת למטה אם
        זה לא נכון.
      </p>
      <MenuEditor
        eventId={eventId}
        initial={draftToEditable(draft)}
        warnings={draft.warnings}
        onCancel={handleCancelReview}
        onSaved={onSaved}
      />
    </div>
  );
}
