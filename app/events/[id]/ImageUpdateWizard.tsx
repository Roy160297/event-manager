"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseEventImageUpdate, applyEventImageUpdate, type EventImageUpdateDraft } from "@/app/events/actions";
import { ImageDropZone } from "@/components/ImageDropZone";
import { DateInput } from "@/components/DateField";
import { TimeInput } from "@/components/TimeField";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventType, StaffRow } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
const inputClass = "rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-xs";

export function ImageUpdateWizard({
  eventId,
  managers,
  salespeople,
}: {
  eventId: string;
  managers: StaffRow[];
  salespeople: StaffRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EventImageUpdateDraft | null>(null);
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
      const result = await parseEventImageUpdate(eventId, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setDraft(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד התמונה");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setIsPending(true);
    setError(null);
    try {
      await applyEventImageUpdate(eventId, draft);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון האירוע");
      setIsPending(false);
    }
  }

  function updateField<K extends keyof EventImageUpdateDraft>(key: K, value: EventImageUpdateDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
      >
        עדכון פרטים מצילום מסך &quot;ענן&quot;
      </button>
    );
  }

  if (!draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3"
      >
        <p className="text-sm font-medium">העלאת צילום מסך מעודכן מ-iPlan (&quot;ענן&quot;)</p>
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
  function labelSpan(key: keyof EventImageUpdateDraft, text: string) {
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
            onChange={(e) => updateField("event_type", e.target.value as EventType)}
            className={inputClass}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
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
          {labelSpan("manager_id", "מנהל/ת אירוע אחראי/ת")}
          <select
            value={draft.manager_id ?? ""}
            onChange={(e) => updateField("manager_id", e.target.value || null)}
            className={inputClass}
          >
            <option value="">ללא אחראי</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {labelSpan("sales_person_id", "איש/ת מכירות")}
          <select
            value={draft.sales_person_id ?? ""}
            onChange={(e) => updateField("sales_person_id", e.target.value || null)}
            className={inputClass}
          >
            <option value="">ללא אחראי</option>
            {salespeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
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
          {labelSpan("kids_meal_count", "מספר מנות ילדים")}
          <input
            value={draft.kids_meal_count ?? ""}
            onChange={(e) => updateField("kids_meal_count", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("glat_meal_count", "מנות גלאט")}
          <input
            type="number"
            min={0}
            value={draft.glat_meal_count ?? ""}
            onChange={(e) => updateField("glat_meal_count", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("vegetarian_meal_count", "מנות צמחוניות")}
          <input
            type="number"
            min={0}
            value={draft.vegetarian_meal_count ?? ""}
            onChange={(e) => updateField("vegetarian_meal_count", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("vegan_meal_count", "מנות טבעוניות")}
          <input
            type="number"
            min={0}
            value={draft.vegan_meal_count ?? ""}
            onChange={(e) => updateField("vegan_meal_count", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("gluten_free_meal_count", "מנות ללא גלוטן")}
          <input
            type="number"
            min={0}
            value={draft.gluten_free_meal_count ?? ""}
            onChange={(e) => updateField("gluten_free_meal_count", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          {labelSpan("toddlers_under_2_count", "ילדים מתחת לגיל 2")}
          <input
            type="number"
            min={0}
            value={draft.toddlers_under_2_count ?? ""}
            onChange={(e) => updateField("toddlers_under_2_count", e.target.value || null)}
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
