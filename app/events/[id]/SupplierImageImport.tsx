"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addSuppliersFromImport, parseSupplierImage } from "@/app/events/actions";
import { ImageDropZone } from "@/components/ImageDropZone";
import type { SupplierImportDraft } from "@/lib/supplierImport";

const inputClass = "rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm";

export function SupplierImageImport({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierImportDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    try {
      const result = await parseSupplierImage(formData);
      if (result.length === 0) throw new Error("לא זוהו ספקים בתמונה");
      setSuppliers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד התמונה");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!suppliers) return;
    setIsPending(true);
    setError(null);
    try {
      await addSuppliersFromImport(eventId, suppliers);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת הספקים");
      setIsPending(false);
    }
  }

  function reset() {
    setOpen(false);
    setSuppliers(null);
    setFileName(null);
    setIsPending(false);
    setError(null);
  }

  function updateSupplier(index: number, field: keyof SupplierImportDraft, value: string) {
    setSuppliers((prev) =>
      prev ? prev.map((s, i) => (i === index ? { ...s, [field]: value || null } : s)) : prev,
    );
  }

  function removeSupplier(index: number) {
    setSuppliers((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
      >
        מילוי אוטומטי מתמונה
      </button>
    );
  }

  if (!suppliers) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3"
      >
        <p className="text-sm font-medium">העלאת תמונה עם רשימת ספקים (למשל צילום מסך של הודעה)</p>
        <ImageDropZone fileInputRef={fileInputRef} fileName={fileName} onFileName={setFileName} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !fileName}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "מעבד..." : "חלץ ספקים"}
          </button>
          <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
            ביטול
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3">
      <p className="text-sm font-medium">בדיקת הספקים שזוהו לפני הוספה - ניתן לערוך או להסיר שורות</p>
      <ul className="flex flex-col gap-2">
        {suppliers.map((supplier, index) => (
          <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span>תפקיד</span>
              <input
                value={supplier.role ?? ""}
                onChange={(e) => updateSupplier(index, "role", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span>שם</span>
              <input
                value={supplier.name}
                onChange={(e) => updateSupplier(index, "name", e.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span>טלפון</span>
              <input
                value={supplier.phone ?? ""}
                onChange={(e) => updateSupplier(index, "phone", e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => removeSupplier(index)}
              className="self-start rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 sm:self-end"
            >
              הסר
            </button>
          </li>
        ))}
        {suppliers.length === 0 && <li className="text-sm text-foreground/60">כל השורות הוסרו.</li>}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border-classic pt-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || suppliers.length === 0}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "מוסיף..." : `הוסף ${suppliers.length} ספקים`}
        </button>
        <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
