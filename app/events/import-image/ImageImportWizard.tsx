"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createEventFromImageImport, parseImageImport } from "./actions";
import { addManagerFromImport } from "@/app/events/import/actions";
import type { ImageImportDraft } from "@/lib/imageImport";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { DateInput } from "@/components/DateField";
import { TimeInput } from "@/components/TimeField";
import type { EventType, StaffRow } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

type Draft = ImageImportDraft & { matched_manager_id: string | null };

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";
const labelClass = "flex flex-col gap-1 text-sm";

export default function ImageImportWizard({ managers }: { managers: StaffRow[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [managerId, setManagerId] = useState("");
  const [managerList, setManagerList] = useState<StaffRow[]>(managers);
  const [isAddingManager, setIsAddingManager] = useState(false);
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
      const result = await parseImageImport(formData);
      setDraft(result);
      setManagerId(result.matched_manager_id ?? "");
      setStep("review");
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
      const { eventId } = await createEventFromImageImport({ ...draft, manager_id: managerId || null });
      router.push(`/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת האירוע");
      setIsPending(false);
    }
  }

  async function handleAddManager() {
    if (!draft?.event_manager_name) return;
    setIsAddingManager(true);
    setError(null);
    try {
      const newManager = await addManagerFromImport(draft.event_manager_name);
      setManagerList((prev) => [...prev, newManager].sort((a, b) => a.name.localeCompare(b.name)));
      setManagerId(newManager.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת האחראי/ת");
    } finally {
      setIsAddingManager(false);
    }
  }

  function updateField<K extends keyof ImageImportDraft>(key: K, value: ImageImportDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (step === "upload" || !draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
      >
        <p className="text-sm font-medium">העלאת צילום מסך מ-iPlan</p>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            בחר קובץ
          </button>
          <span className="text-sm text-foreground/60">{fileName ?? "לא נבחר קובץ"}</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !fileName}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "מעבד..." : "העלה תמונה"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
      {draft.warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {draft.warnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className="font-serif text-lg font-bold">בדיקת הנתונים לפני יצירת האירוע</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span className="font-medium">שם הלקוח / הזוג</span>
          <input
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">סוג האירוע</span>
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
          <span className="font-medium">שם הכלה</span>
          <input
            value={draft.bride_name ?? ""}
            onChange={(e) => updateField("bride_name", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שם החתן</span>
          <input
            value={draft.groom_name ?? ""}
            onChange={(e) => updateField("groom_name", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">תאריך</span>
          <DateInput value={draft.event_date ?? ""} onChange={(v) => updateField("event_date", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שעת התחלה</span>
          <TimeInput value={draft.start_time ?? "19:30"} onChange={(v) => updateField("start_time", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שעת סיום</span>
          <TimeInput value={draft.end_time ?? "03:00"} onChange={(v) => updateField("end_time", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">מנהל/ת אירוע אחראי/ת</span>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClass}>
            <option value="">ללא אחראי (ייבחר יוצר האירוע)</option>
            {managerList.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
          {draft.event_manager_name && (
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              {draft.matched_manager_id ? (
                <span>{`זוהתה התאמה אוטומטית ל-"${draft.event_manager_name}" — ניתן לשנות`}</span>
              ) : managerList.some((m) => m.id === managerId && m.name === draft.event_manager_name) ? (
                <span>{`"${draft.event_manager_name}" נוסף/ה לרשימת האחראים ונבחר/ה`}</span>
              ) : (
                <>
                  <span>{`לא נמצאה התאמה עבור "${draft.event_manager_name}"`}</span>
                  <button
                    type="button"
                    onClick={handleAddManager}
                    disabled={isAddingManager}
                    className="rounded-full border border-accent px-2 py-0.5 text-xs text-accent hover:bg-accent-soft disabled:opacity-50"
                  >
                    {isAddingManager ? "מוסיף..." : `+ הוסף/י כאחראי/ת`}
                  </button>
                </>
              )}
            </div>
          )}
        </label>

        <label className={labelClass}>
          <span className="font-medium">איש/ת מכירות</span>
          <input
            value={draft.sales_person_name ?? ""}
            onChange={(e) => updateField("sales_person_name", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">אורחים - התחייבות</span>
          <input
            value={draft.estimated_guests ?? ""}
            onChange={(e) => updateField("estimated_guests", e.target.value || null)}
            placeholder='לדוגמה: 200+14'
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">אימייל 1</span>
          <input
            type="email"
            value={draft.contact_email ?? ""}
            onChange={(e) => updateField("contact_email", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">טלפון 1</span>
          <input
            type="tel"
            value={draft.contact_phone ?? ""}
            onChange={(e) => updateField("contact_phone", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">אימייל 2</span>
          <input
            type="email"
            value={draft.contact_email_2 ?? ""}
            onChange={(e) => updateField("contact_email_2", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">טלפון 2</span>
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
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "יוצר אירוע..." : "צור אירוע"}
        </button>
        <button type="button" onClick={() => setStep("upload")} className="text-sm text-foreground/60 hover:underline">
          ביטול / העלה תמונה אחרת
        </button>
      </div>
    </div>
  );
}
