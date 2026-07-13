"use client";

import { useState } from "react";
import { importGuests, parseGuestCsv, type GuestColumnMapping } from "./actions";
import type { ParsedCsv } from "@/lib/csv-import";

const FIELDS: { key: keyof GuestColumnMapping; label: string; required?: boolean }[] = [
  { key: "name", label: "שם האורח", required: true },
  { key: "email", label: "אימייל" },
  { key: "phone", label: "טלפון" },
  { key: "rsvp_status", label: "סטטוס הגעה" },
  { key: "party_size", label: "מספר סועדים" },
  { key: "dietary_notes", label: "הערות תזונה" },
  { key: "seating_table", label: "שולחן הושבה" },
];

export default function GuestCsvImport({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<GuestColumnMapping>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function reset() {
    setStep("upload");
    setParsed(null);
    setMapping({});
    setError(null);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    try {
      const result = await parseGuestCsv(formData);
      setParsed(result);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  async function handleImport() {
    if (!parsed || !mapping.name) {
      setError("יש לבחור עמודה לשם האורח");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      await importGuests(eventId, parsed.rows, mapping as GuestColumnMapping);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא האורחים");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        הייבוא הושלם בהצלחה.{" "}
        <button className="underline" onClick={reset}>
          ייבוא קובץ נוסף
        </button>
      </div>
    );
  }

  if (step === "map" && parsed) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">
          זוהה קידוד: {parsed.detectedEncoding} · נמצאו {parsed.rows.length} שורות. התאימו כל שדה
          לעמודה המתאימה בקובץ.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span>
                {field.label}
                {field.required && " *"}
              </span>
              <select
                value={mapping[field.key] ?? ""}
                onChange={(e) =>
                  setMapping((current) => ({ ...current, [field.key]: e.target.value }))
                }
                className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">— לא לייבא —</option>
                {parsed.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {parsed.rows.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-1 text-sm font-medium">תצוגה מקדימה (3 שורות ראשונות)</p>
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr>
                  {parsed.headers.map((header) => (
                    <th
                      key={header}
                      className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 3).map((row, index) => (
                  <tr key={index}>
                    {parsed.headers.map((header) => (
                      <td
                        key={header}
                        className="border-b border-neutral-100 p-2 dark:border-neutral-900"
                      >
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={isPending}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isPending ? "מייבא..." : `ייבא ${parsed.rows.length} אורחים`}
          </button>
          <button
            onClick={reset}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleUpload}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <p className="text-sm font-medium">ייבוא רשימת אורחים מ-iPlan (CSV)</p>
      <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "מעבד..." : "העלה קובץ"}
      </button>
    </form>
  );
}
