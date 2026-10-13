"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  parsePrivateEventImageUpdate,
  applyPrivateEventImageUpdate,
  type PrivateEventImageUpdateDraft,
} from "@/app/private-events/actions";
import { ImageDropZone } from "@/components/ImageDropZone";
import { DateInput } from "@/components/DateField";
import { TimeInput } from "@/components/TimeField";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { compressImage } from "@/lib/clientImageCompress";
import type { PrivateEventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(PRIVATE_EVENT_TYPE_LABELS) as PrivateEventType[];
const inputClass = "rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-xs";

// A hard server-side timeout or crash mid-request (rare, but possible on a
// slow/overloaded image-extraction pass) never reaches our own try/catch in
// actions.ts - it breaks the Server Action's response itself, and React
// surfaces that as this generic untranslated message instead of throwing
// one of our own Hebrew errors. Map it to a matching Hebrew message so the
// upload screen doesn't show a stray English sentence.
function friendlyUploadError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (!message || /unexpected response/i.test(message)) {
    return "הפעולה ארכה זמן רב מדי או שהשרת לא הגיב - נסו להעלות את התמונה שוב.";
  }
  return message;
}

export function ImageUpdateWizard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PrivateEventImageUpdateDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setOpen(false);
    setDraft(null);
    setFileName(null);
    setIsPending(false);
    setError(null);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    try {
      const file = formData.get("file");
      if (file instanceof File) {
        // Downscaling before upload trades some reading accuracy on small
        // text for a faster upload and a faster Gemini read - a deliberate
        // tradeoff per venue request, to ease "server busy" overload errors.
        formData.set("file", await compressImage(file, 1800, 0.85));
      }
      const result = await parsePrivateEventImageUpdate(eventId, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setDraft(result);
      }
    } catch (err) {
      setError(friendlyUploadError(err));
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setIsPending(true);
    setError(null);
    try {
      await applyPrivateEventImageUpdate(eventId, draft);
      reset();
      router.refresh();
    } catch (err) {
      setError(friendlyUploadError(err));
      setIsPending(false);
    }
  }

  function updateField<K extends keyof PrivateEventImageUpdateDraft>(key: K, value: PrivateEventImageUpdateDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
      >
        העלאת צילום מסך מעודכן
      </button>
    );
  }

  if (!draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3"
      >
        <p className="text-sm font-medium">העלאת צילום מסך מעודכן (&quot;ענן&quot;\מייל מאיש מכירות)</p>
        <ImageDropZone fileInputRef={fileInputRef} fileName={fileName} onFileName={setFileName} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !fileName}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "מעבד..." : "חלץ פרטים"}
          </button>
          <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
            ביטול
          </button>
        </div>
      </form>
    );
  }

  const changed = new Set(draft.changedFields);
  function labelSpan(key: keyof PrivateEventImageUpdateDraft, text: string) {
    return <span className={changed.has(key) ? "font-bold text-accent" : "font-medium"}>{text}</span>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3">
      {draft.warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {draft.warnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className="text-sm font-medium">
        בדיקת הפרטים לפני עדכון האירוע - שדות שלא זוהו בתמונה נשארו כפי שהיו. שדות שכן השתנו מסומנים{" "}
        <span className="font-bold text-accent">כך</span>.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          {labelSpan("name", "שם הלקוח / הזוג")}
          <input value={draft.name} onChange={(e) => updateField("name", e.target.value)} required className={inputClass} />
        </label>

        <label className={labelClass}>
          {labelSpan("event_type", "סוג האירוע")}
          <select
            value={draft.event_type}
            onChange={(e) => updateField("event_type", e.target.value as PrivateEventType)}
            className={inputClass}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRIVATE_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {labelSpan("event_date", "תאריך")}
          <DateInput value={draft.event_date} onChange={(v) => updateField("event_date", v)} />
        </label>

        <label className={labelClass}>
          {labelSpan("start_time", "שעת התחלה")}
          <TimeInput value={draft.start_time ?? ""} onChange={(v) => updateField("start_time", v || null)} />
        </label>

        <label className={labelClass}>
          {labelSpan("end_time", "שעת סיום")}
          <TimeInput value={draft.end_time ?? ""} onChange={(v) => updateField("end_time", v || null)} />
        </label>

        <label className={labelClass}>
          {labelSpan("estimated_guests", "מספר אורחים - התחייבות")}
          <input
            value={draft.estimated_guests ?? ""}
            onChange={(e) => updateField("estimated_guests", e.target.value || null)}
            placeholder='לדוגמה: 200+14'
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("contact_email", "אימייל 1")}
          <input
            type="email"
            value={draft.contact_email ?? ""}
            onChange={(e) => updateField("contact_email", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("contact_phone", "טלפון 1")}
          <input
            type="tel"
            value={draft.contact_phone ?? ""}
            onChange={(e) => updateField("contact_phone", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("contact_email_2", "אימייל 2")}
          <input
            type="email"
            value={draft.contact_email_2 ?? ""}
            onChange={(e) => updateField("contact_email_2", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("contact_phone_2", "טלפון 2")}
          <input
            type="tel"
            value={draft.contact_phone_2 ?? ""}
            onChange={(e) => updateField("contact_phone_2", e.target.value || null)}
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border-classic pt-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "מעדכן..." : "עדכן אירוע"}
        </button>
        <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
