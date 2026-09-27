"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addTimelineItemsFromImport, parseTimelineImage } from "./actions";
import { ImageDropZone } from "@/components/ImageDropZone";
import { TimeInput } from "@/components/TimeField";
import type { TimelineImportDraft } from "@/lib/timelineImport";

const inputClass = "rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm";

export function TimelineImageImport({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TimelineImportDraft[] | null>(null);
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
      const result = await parseTimelineImage(formData);
      if (result.length === 0) throw new Error("לא זוהו שלבים בתמונה");
      setSteps(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד התמונה");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!steps) return;
    setIsPending(true);
    setError(null);
    try {
      await addTimelineItemsFromImport(eventId, steps);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת השלבים");
      setIsPending(false);
    }
  }

  function reset() {
    setOpen(false);
    setSteps(null);
    setFileName(null);
    setIsPending(false);
    setError(null);
  }

  function updateStep(index: number, field: keyof TimelineImportDraft, value: string) {
    setSteps((prev) => (prev ? prev.map((s, i) => (i === index ? { ...s, [field]: value || null } : s)) : prev));
  }

  function removeStep(index: number) {
    setSteps((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
      >
        מילוי אוטומטי מתמונה
      </button>
    );
  }

  if (!steps) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3"
      >
        <p className="text-sm font-medium">העלאת תמונה עם לוח זמנים (למשל צילום מסך של הודעה)</p>
        <ImageDropZone fileInputRef={fileInputRef} fileName={fileName} onFileName={setFileName} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !fileName}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "מעבד..." : "חלץ לוח זמנים"}
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
      <p className="text-sm font-medium">בדיקת השלבים שזוהו לפני הוספה - ניתן לערוך או להסיר שורות</p>
      <ul className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs">
              <span>שעה</span>
              <TimeInput value={step.approx_time ?? ""} onChange={(v) => updateStep(index, "approx_time", v)} />
            </label>
            <label className="flex flex-[2] flex-col gap-1 text-xs">
              <span>תיאור</span>
              <input
                value={step.label}
                onChange={(e) => updateStep(index, "label", e.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span>הערות</span>
              <input
                value={step.notes ?? ""}
                onChange={(e) => updateStep(index, "notes", e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => removeStep(index)}
              className="self-start rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 sm:self-end"
            >
              הסר
            </button>
          </li>
        ))}
        {steps.length === 0 && <li className="text-sm text-foreground/60">כל השורות הוסרו.</li>}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border-classic pt-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || steps.length === 0}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "מוסיף..." : `הוסף ${steps.length} שלבים ללוח הזמנים`}
        </button>
        <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
