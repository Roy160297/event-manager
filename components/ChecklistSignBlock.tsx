"use client";

import { useState } from "react";
import { SignaturePad } from "./SignaturePad";

function formatSignedAt(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("he-IL") + " " + date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function ChecklistSignBlock({
  isSigned,
  signedByName,
  signedAt,
  signatureData,
  canEdit,
  defaultSignerName,
  onSign,
  onUnsign,
}: {
  isSigned: boolean;
  signedByName?: string | null;
  signedAt?: string | null;
  signatureData?: string | null;
  canEdit: boolean;
  defaultSignerName?: string | null;
  onSign: (name: string, signatureDataUrl: string) => Promise<void>;
  onUnsign: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultSignerName ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSign() {
    if (!name.trim()) {
      setError("יש להזין שם החותם/ת");
      return;
    }
    if (!signature) {
      setError("יש לצייר חתימה");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSign(name.trim(), signature);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת החתימה");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitUnsign() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onUnsign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביטול החתימה");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSigned) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-green-800">
            נחתם על ידי {signedByName} {signedAt && `· ${formatSignedAt(signedAt)}`}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={submitUnsign}
              disabled={isSubmitting}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              {isSubmitting ? "מבטל..." : "ביטול חתימה"}
            </button>
          )}
        </div>
        {signatureData && (
          // eslint-disable-next-line @next/next/no-img-element -- small stored signature preview
          <img src={signatureData} alt="חתימה" className="h-14 object-contain" />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (!canEdit) {
    return <p className="text-sm text-foreground/60">הצ&apos;קליסט טרם נחתם.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        חתימה ואישור סופי
      </button>

      {open && (
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border-classic bg-accent-soft/30 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>שם החותם/ת</span>
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
            onClick={submitSign}
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
