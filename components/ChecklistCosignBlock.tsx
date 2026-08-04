"use client";

import { useRef, useState } from "react";
import { SignaturePad } from "./SignaturePad";

function formatSignedAt(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("he-IL") + " " + date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// Second sign-off step, shown only after the role holder has already signed
// their own checklist (see ChecklistSignBlock) - the event manager reviews
// and co-signs the same checklist before it's fully approved.
export function ChecklistCosignBlock({
  isCosigned,
  cosignedByName,
  cosignedAt,
  cosignatureData,
  canCosign,
  defaultSignerName,
  onCosign,
  onUncosign,
}: {
  isCosigned: boolean;
  cosignedByName?: string | null;
  cosignedAt?: string | null;
  cosignatureData?: string | null;
  canCosign: boolean;
  defaultSignerName?: string | null;
  onCosign: (name: string, signatureDataUrl: string) => Promise<void>;
  onUncosign: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultSignerName ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  async function submit() {
    if (!name.trim()) {
      setError("יש להזין שם החותם/ת");
      return;
    }
    if (!signature) {
      setError("יש לצייר חתימה");
      return;
    }
    // Captured before the await, since this whole subtree can unmount
    // (swapped for the "cosigned" branch) once onCosign's revalidation lands.
    const detailsEl = rootRef.current?.closest("details");
    setIsSubmitting(true);
    setError(null);
    try {
      await onCosign(name.trim(), signature);
      setOpen(false);
      detailsEl?.removeAttribute("open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת האישור");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitUncosign() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onUncosign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביטול האישור");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCosigned) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-blue-800">
            אושר על ידי מנהל/ת האירוע: {cosignedByName} {cosignedAt && `· ${formatSignedAt(cosignedAt)}`}
          </p>
          {canCosign && (
            <button
              type="button"
              onClick={submitUncosign}
              disabled={isSubmitting}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              {isSubmitting ? "מבטל..." : "ביטול אישור"}
            </button>
          )}
        </div>
        {cosignatureData && (
          // eslint-disable-next-line @next/next/no-img-element -- small stored signature preview
          <img src={cosignatureData} alt="אישור מנהל אירוע" className="h-14 object-contain" />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (!canCosign) {
    return <p className="text-sm text-amber-700">ממתין לאישור מנהל/ת האירוע.</p>;
  }

  return (
    <div ref={rootRef} className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        אישור מנהל/ת אירוע
      </button>

      {open && (
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border-classic bg-accent-soft/30 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>שם המאשר/ת</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <SignaturePad onChange={setSignature} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "שומר..." : "אשר וחתום"}
          </button>
        </div>
      )}
    </div>
  );
}
