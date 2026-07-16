"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removeTableSketch, uploadTableSketch } from "./actions";

export default function TableSketchPhoto({
  eventId,
  sketchUrl,
  isPdf,
}: {
  eventId: string;
  sketchUrl: string | null;
  isPdf: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsPending(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadTableSketch(eventId, formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setIsPending(true);
    try {
      await removeTableSketch(eventId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהסרת הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">סקיצת פריסת שולחנות</p>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft disabled:opacity-50"
          >
            {isPending ? "מעלה..." : sketchUrl ? "החלף תמונה" : "העלה תמונת סקיצה"}
          </button>
          {sketchUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="rounded-full border border-border-classic px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              הסר
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {sketchUrl ? (
        isPdf ? (
          <div className="flex flex-col gap-2">
            <embed
              src={sketchUrl}
              type="application/pdf"
              className="h-[600px] w-full rounded-md border border-border-classic"
            />
            <a href={sketchUrl} target="_blank" rel="noopener noreferrer" className="self-start text-sm underline">
              אם הקובץ לא מוצג כראוי - פתח/י אותו בכרטיסייה חדשה
            </a>
          </div>
        ) : (
          <a href={sketchUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sketchUrl}
              alt="סקיצת פריסת שולחנות"
              className="max-h-[600px] w-full rounded-md border border-border-classic object-contain"
            />
          </a>
        )
      ) : (
        <p className="text-sm text-foreground/60">
          העלו תמונה או PDF של סקיצת הפריסה כדי שיהיה ניתן לראות אותה כאן בזמן שיבוץ המלצרים.
        </p>
      )}
    </div>
  );
}
