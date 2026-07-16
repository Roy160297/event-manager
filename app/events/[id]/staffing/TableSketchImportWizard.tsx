"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createLocationsFromSketch, parseTableSketchImport } from "./actions";
import type { TableSketchDraft } from "@/lib/tableSketchImport";

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";

export default function TableSketchImportWizard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TableSketchDraft | null>(null);
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
      const result = await parseTableSketchImport(formData);
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setIsPending(true);
    setError(null);
    try {
      await createLocationsFromSketch(eventId, draft);
      setDraft(null);
      setFileName(null);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת השולחנות");
    } finally {
      setIsPending(false);
    }
  }

  function updateTable(index: number, patch: Partial<TableSketchDraft["tables"][number]>) {
    setDraft((prev) =>
      prev ? { ...prev, tables: prev.tables.map((t, i) => (i === index ? { ...t, ...patch } : t)) } : prev,
    );
  }

  function removeTable(index: number) {
    setDraft((prev) => (prev ? { ...prev, tables: prev.tables.filter((_, i) => i !== index) } : prev));
  }

  function updateFoodStand(index: number, label: string) {
    setDraft((prev) =>
      prev ? { ...prev, foodStands: prev.foodStands.map((f, i) => (i === index ? { label } : f)) } : prev,
    );
  }

  function removeFoodStand(index: number) {
    setDraft((prev) => (prev ? { ...prev, foodStands: prev.foodStands.filter((_, i) => i !== index) } : prev));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
      >
        ייבוא סקיצת שולחנות מ-iPlan
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      {!draft ? (
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <p className="text-sm font-medium">העלאת סקיצת שולחנות (PDF מ-iPlan)</p>
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".pdf,application/pdf"
            required
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
            >
              בחר קובץ
            </button>
            <span className="text-sm text-foreground/60">{fileName ?? "לא נבחר קובץ"}</span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !fileName}
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "מעבד..." : "העלה קובץ"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
            >
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {draft.warnings.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {draft.warnings.map((warning, i) => (
                <p key={i}>⚠ {warning}</p>
              ))}
            </div>
          )}

          <p className="text-sm font-medium">בדיקת הנתונים לפני יצירת השולחנות והעמדות</p>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground/60">שולחנות ({draft.tables.length})</p>
            <ul className="flex flex-col gap-2">
              {draft.tables.map((table, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    value={table.label}
                    onChange={(e) => updateTable(index, { label: e.target.value })}
                    placeholder="מספר שולחן"
                    className={`w-28 ${inputClass}`}
                  />
                  <input
                    type="number"
                    min={0}
                    value={table.capacity}
                    onChange={(e) => updateTable(index, { capacity: Number(e.target.value) || 0 })}
                    placeholder="קיבולת"
                    className={`w-24 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeTable(index)}
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground/60">עמדות אוכל ({draft.foodStands.length})</p>
            <ul className="flex flex-col gap-2">
              {draft.foodStands.map((stand, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    value={stand.label}
                    onChange={(e) => updateFoodStand(index, e.target.value)}
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeFoodStand(index)}
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "יוצר..." : "צור שולחנות ועמדות"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setFileName(null);
              }}
              className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
