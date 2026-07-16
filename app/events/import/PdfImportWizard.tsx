"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addManagerFromImport, createEventFromPdfImport, parsePdfImport } from "./actions";
import type { PdfImportDraft, ScheduleItemDraft, SupplierDraft } from "@/lib/pdfImport";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { TimeSelects } from "@/components/TimeField";
import { DateSelects } from "@/components/DateField";
import type { EventType, StaffRow } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

type Draft = PdfImportDraft & { matched_manager_id: string | null };

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";
const labelClass = "flex flex-col gap-1 text-sm";

export default function PdfImportWizard({ managers }: { managers: StaffRow[] }) {
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
      const result = await parsePdfImport(formData);
      setDraft(result);
      setManagerId(result.matched_manager_id ?? "");
      setStep("review");
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
      const { eventId } = await createEventFromPdfImport({ ...draft, manager_id: managerId || null });
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

  function updateField<K extends keyof PdfImportDraft>(key: K, value: PdfImportDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateScheduleRow(index: number, patch: Partial<ScheduleItemDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const schedule = prev.schedule.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return { ...prev, schedule };
    });
  }

  function removeScheduleRow(index: number) {
    setDraft((prev) => (prev ? { ...prev, schedule: prev.schedule.filter((_, i) => i !== index) } : prev));
  }

  function addScheduleRow() {
    setDraft((prev) =>
      prev ? { ...prev, schedule: [...prev.schedule, { label: "", approx_time: "" }] } : prev,
    );
  }

  function updateSupplierRow(index: number, patch: Partial<SupplierDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const suppliers = prev.suppliers.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return { ...prev, suppliers };
    });
  }

  function removeSupplierRow(index: number) {
    setDraft((prev) => (prev ? { ...prev, suppliers: prev.suppliers.filter((_, i) => i !== index) } : prev));
  }

  function addSupplierRow() {
    setDraft((prev) =>
      prev ? { ...prev, suppliers: [...prev.suppliers, { role: null, name: "", phone: null }] } : prev,
    );
  }

  if (step === "upload" || !draft) {
    return (
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
      >
        <p className="text-sm font-medium">העלאת קובץ PDF מ-iPlan</p>
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
          {isPending ? "מעבד..." : "העלה קובץ"}
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
          <DateSelects value={draft.event_date ?? ""} onChange={(v) => updateField("event_date", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שעת התחלה</span>
          <TimeSelects value={draft.start_time ?? ""} onChange={(v) => updateField("start_time", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שעת סיום</span>
          <TimeSelects value={draft.end_time ?? ""} onChange={(v) => updateField("end_time", v || null)} />
        </label>

        <label className={labelClass}>
          <span className="font-medium">מנהל/ת אירוע אחראי/ת</span>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClass}>
            <option value="">ללא אחראי</option>
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
          <span className="font-medium">סוג הגשה</span>
          <input
            value={draft.service_style ?? ""}
            onChange={(e) => updateField("service_style", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">אורחים בוגרים</span>
          <input
            type="number"
            min={0}
            value={draft.guests_adults ?? ""}
            onChange={(e) => updateField("guests_adults", e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">ילדים</span>
          <input
            type="number"
            min={0}
            value={draft.guests_children ?? ""}
            onChange={(e) => updateField("guests_children", e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">אורחים רזרבה</span>
          <input
            type="number"
            min={0}
            value={draft.guests_reserve ?? ""}
            onChange={(e) => updateField("guests_reserve", e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שמות הורי הכלה</span>
          <input
            value={draft.bride_parents_names ?? ""}
            onChange={(e) => updateField("bride_parents_names", e.target.value || null)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">שמות הורי החתן</span>
          <input
            value={draft.groom_parents_names ?? ""}
            onChange={(e) => updateField("groom_parents_names", e.target.value || null)}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        <span className="font-medium">מידע נוסף</span>
        <textarea
          rows={3}
          value={draft.menu_notes ?? ""}
          onChange={(e) => updateField("menu_notes", e.target.value || null)}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        <span className="font-medium">הערות חניה</span>
        <textarea
          rows={2}
          value={draft.parking_notes ?? ""}
          onChange={(e) => updateField("parking_notes", e.target.value || null)}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2 border-t border-border-classic pt-3">
        <p className="font-medium">לוז אירוע</p>
        {draft.schedule.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <TimeSelects
              value={item.approx_time}
              onChange={(v) => updateScheduleRow(index, { approx_time: v })}
            />
            <input
              value={item.label}
              onChange={(e) => updateScheduleRow(index, { label: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeScheduleRow(index)}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
            >
              הסר
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addScheduleRow}
          className="self-start rounded-full border border-accent px-3 py-1 text-sm text-accent hover:bg-accent-soft"
        >
          + הוסף שלב
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border-classic pt-3">
        <p className="font-medium">ספקים</p>
        {draft.suppliers.map((supplier, index) => {
          const lowConfidence = supplier.role === null && supplier.phone === null;
          return (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-md p-1 ${lowConfidence ? "border border-amber-400" : ""}`}
            >
              <input
                placeholder="תפקיד"
                value={supplier.role ?? ""}
                onChange={(e) => updateSupplierRow(index, { role: e.target.value || null })}
                className={`${inputClass} w-28`}
              />
              <input
                placeholder="שם"
                value={supplier.name}
                onChange={(e) => updateSupplierRow(index, { name: e.target.value })}
                className={`${inputClass} flex-1`}
              />
              <input
                placeholder="טלפון"
                value={supplier.phone ?? ""}
                onChange={(e) => updateSupplierRow(index, { phone: e.target.value || null })}
                className={`${inputClass} w-36`}
              />
              <button
                type="button"
                onClick={() => removeSupplierRow(index)}
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
              >
                הסר
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSupplierRow}
          className="self-start rounded-full border border-accent px-3 py-1 text-sm text-accent hover:bg-accent-soft"
        >
          + הוסף ספק
        </button>
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
          ביטול / העלה קובץ אחר
        </button>
      </div>
    </div>
  );
}
