"use client";

import { useState } from "react";
import { importWaiters, parseWaitersFile } from "./actions";
import { mapWaiterRows, type WaiterColumnMapping } from "@/lib/waiterImport";
import type { ParsedCsv } from "@/lib/csv-import";

// Staff-roster exports vary in exact wording, so a few common alias spellings
// are tried rather than requiring one fixed template.
const ALIASES: Record<keyof WaiterColumnMapping, string[]> = {
  name: ["שם מלא", "שם", "שם פרטי", "שם עובד", "שם המלצר"],
  phone: ["מס טלפון", "מספר טלפון", "טלפון", "נייד", "טלפון נייד"],
};

function guessMapping(headers: string[]): Partial<WaiterColumnMapping> {
  const mapping: Partial<WaiterColumnMapping> = {};
  for (const key of Object.keys(ALIASES) as (keyof WaiterColumnMapping)[]) {
    const match = headers.find((header) => ALIASES[key].includes(header.trim()));
    if (match) mapping[key] = match;
  }
  return mapping;
}

export default function WaitersImportWizard() {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<WaiterColumnMapping | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  function reset() {
    setStep("upload");
    setParsed(null);
    setMapping(null);
    setFileName(null);
    setError(null);
    setResult(null);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    try {
      const parsedFile = await parseWaitersFile(formData);
      const guessed = guessMapping(parsedFile.headers);
      if (!guessed.name) {
        setError('לא זוהתה עמודת "שם" בקובץ — ודאו שיש כותרת עמודה כמו "שם מלא" או "שם".');
        return;
      }
      setParsed(parsedFile);
      setMapping(guessed as WaiterColumnMapping);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  async function handleImport() {
    if (!parsed || !mapping) return;
    setIsPending(true);
    setError(null);
    try {
      const importResult = await importWaiters(parsed.rows, mapping);
      setResult(importResult);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא המלצרים");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        נוספו {result.added} מלצרים חדשים למאגר
        {result.skipped > 0 && ` (${result.skipped} כבר היו קיימים ולא נוספו שוב)`}.{" "}
        <button className="underline" onClick={reset}>
          ייבוא קובץ נוסף
        </button>
      </div>
    );
  }

  if (step === "preview" && parsed && mapping) {
    const mappedRows = mapWaiterRows(parsed.rows, mapping);

    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
        <p className="text-sm text-foreground/60">
          נמצאו {mappedRows.length} מלצרים בקובץ. מלצרים ששמם כבר קיים במאגר יידלגו אוטומטית ולא ייכפלו.
        </p>

        {mappedRows.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-1 text-sm font-medium">תצוגה מקדימה (5 ראשונים)</p>
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border-classic p-2 text-right">שם</th>
                  <th className="border-b border-border-classic p-2 text-right">טלפון</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 5).map((waiter, index) => (
                  <tr key={index}>
                    <td className="border-b border-border-classic p-2">{waiter.name}</td>
                    <td className="border-b border-border-classic p-2">{waiter.phone ?? "—"}</td>
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
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "מייבא..." : `ייבא ${mappedRows.length} מלצרים`}
          </button>
          <button
            onClick={reset}
            className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
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
      className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
    >
      <p className="text-sm font-medium">ייבוא רשימת מלצרים מקובץ (Excel/CSV)</p>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft">
          בחר קובץ
          <input
            type="file"
            name="file"
            accept=".csv,text/csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <span className="text-sm text-foreground/60">{fileName ?? "לא נבחר קובץ"}</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "מעבד..." : "העלה קובץ"}
      </button>
    </form>
  );
}
