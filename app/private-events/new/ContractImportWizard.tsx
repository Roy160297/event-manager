"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseContractPdf, createPrivateEventFromContract } from "@/app/private-events/actions";
import { DateInput } from "@/components/DateField";
import { TimeInput } from "@/components/TimeField";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import type { ContractImportDraft } from "@/lib/contractImport";
import type { PrivateEventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(PRIVATE_EVENT_TYPE_LABELS) as PrivateEventType[];
const inputClass = "rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-xs font-medium";

// A server crash or timeout mid-request never reaches the action's own
// try/catch - React surfaces it as a generic English message, mapped here to
// a Hebrew one (same as ImageUpdateWizard).
function friendlyUploadError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (!message || /unexpected response|failed to fetch/i.test(message)) {
    return "הפעולה ארכה זמן רב מדי או שהשרת לא הגיב - נסו להעלות את החוזה שוב.";
  }
  return message;
}

export function ContractImportWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<ContractImportDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDraft(null);
    setError(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await parseContractPdf(new FormData(e.currentTarget));
      if ("error" in result) setError(result.error);
      else setDraft(result);
    } catch (err) {
      setError(friendlyUploadError(err));
    } finally {
      setIsPending(false);
    }
  }

  async function handleCreate() {
    if (!draft) return;
    setError(null);
    setIsPending(true);
    try {
      const result = await createPrivateEventFromContract(draft);
      if ("error" in result) {
        setError(result.error);
        setIsPending(false);
        return;
      }
      router.push(`/private-events/${result.id}`);
    } catch (err) {
      setError(friendlyUploadError(err));
      setIsPending(false);
    }
  }

  function updateField<K extends keyof ContractImportDraft>(key: K, value: ContractImportDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (!draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex max-w-md flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-4"
      >
        <h2 className="text-base font-bold">יצירת אירוע מחוזה חתום</h2>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="application/pdf"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="text-sm file:me-3 file:rounded-full file:border file:border-accent file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-accent"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !fileName}
          className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "קורא את החוזה..." : "חלץ פרטים"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-4">
      <h2 className="text-base font-bold">בדיקת הפרטים לפני יצירת האירוע</h2>

      {draft.warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {draft.warnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          שם הלקוח / הזוג
          <input value={draft.name} onChange={(e) => updateField("name", e.target.value)} required className={inputClass} />
        </label>

        <label className={labelClass}>
          סוג האירוע
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
          תאריך
          <DateInput value={draft.event_date ?? ""} onChange={(v) => updateField("event_date", v || null)} />
        </label>

        <label className={labelClass}>
          שעת התחלה
          <TimeInput value={draft.start_time ?? ""} onChange={(v) => updateField("start_time", v || null)} />
        </label>

        <label className={labelClass}>
          מקום / אולם
          <input
            value={draft.hall_name ?? ""}
            onChange={(e) => updateField("hall_name", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          כמות אורחים משוערת
          <input
            value={draft.estimated_guests ?? ""}
            onChange={(e) => updateField("estimated_guests", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          אימייל 1
          <input
            type="email"
            value={draft.contact_email ?? ""}
            onChange={(e) => updateField("contact_email", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          טלפון 1
          <input
            type="tel"
            value={draft.contact_phone ?? ""}
            onChange={(e) => updateField("contact_phone", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <span className="hidden sm:block" />

        <label className={labelClass}>
          אימייל 2
          <input
            type="email"
            value={draft.contact_email_2 ?? ""}
            onChange={(e) => updateField("contact_email_2", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          טלפון 2
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
          onClick={handleCreate}
          disabled={isPending || !draft.name.trim() || !draft.event_date}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "יוצר..." : "צור אירוע"}
        </button>
        <button type="button" onClick={reset} className="text-sm text-foreground/60 hover:underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
