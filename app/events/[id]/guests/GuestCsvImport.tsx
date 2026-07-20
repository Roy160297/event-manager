"use client";

import { useState } from "react";
import { importGuests, parseGuestFile, type GuestColumnMapping } from "./actions";
import type { ParsedCsv } from "@/lib/csv-import";

// The guest-list template is fixed, so columns are always detected by these
// known header aliases rather than asking the user to map them by hand.
const ALIASES: Record<keyof GuestColumnMapping, string[]> = {
  name: ["שם פרטי+שם משפחה", "שם", "שם אורח", "שם מלא"],
  party_size: ["הושבו בשולחן", "מספר סועדים", "סועדים", "כמות"],
  seating_table: ["שולחן", "שולחן הושבה", "מספר שולחן"],
};

function guessMapping(headers: string[]): Partial<GuestColumnMapping> {
  const mapping: Partial<GuestColumnMapping> = {};
  for (const key of Object.keys(ALIASES) as (keyof GuestColumnMapping)[]) {
    const match = headers.find((header) => ALIASES[key].includes(header.trim()));
    if (match) mapping[key] = match;
  }
  return mapping;
}

export default function GuestCsvImport({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<GuestColumnMapping | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function reset() {
    setStep("upload");
    setParsed(null);
    setMapping(null);
    setFileName(null);
    setError(null);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    try {
      const result = await parseGuestFile(formData);
      const guessed = guessMapping(result.headers);
      if (!guessed.name) {
        setError('לא זוהתה עמודת "שם האורח" בקובץ — ודאו שמדובר בקובץ בפורמט הרגיל.');
        return;
      }
      setParsed(result);
      setMapping(guessed as GuestColumnMapping);
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
      await importGuests(eventId, parsed.rows, mapping);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא האורחים");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        הייבוא הושלם בהצלחה.{" "}
        <button className="underline" onClick={reset}>
          ייבוא קובץ נוסף
        </button>
      </div>
    );
  }

  if (step === "preview" && parsed && mapping) {
    const previewRows = parsed.rows.slice(0, 3).map((row) => ({
      name: row[mapping.name],
      party_size: mapping.party_size ? row[mapping.party_size] : "1",
      seating_table: (mapping.seating_table ? row[mapping.seating_table] : "") || "—",
    }));

    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
        <p className="text-sm text-foreground/60">
          זוהה קידוד: {parsed.detectedEncoding} · נמצאו {parsed.rows.length} אורחים בקובץ. הייבוא
          יחליף את רשימת האורחים הקיימת באירוע זה.
        </p>

        {previewRows.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-1 text-sm font-medium">תצוגה מקדימה (3 שורות ראשונות)</p>
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border-classic p-2 text-right">שם האורח</th>
                  <th className="border-b border-border-classic p-2 text-right">מספר סועדים</th>
                  <th className="border-b border-border-classic p-2 text-right">שולחן</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    <td className="border-b border-border-classic p-2">{row.name}</td>
                    <td className="border-b border-border-classic p-2">{row.party_size}</td>
                    <td className="border-b border-border-classic p-2">{row.seating_table}</td>
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
            {isPending ? "מייבא..." : `ייבא ${parsed.rows.length} אורחים`}
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
      <p className="text-sm font-medium">ייבוא קובץ &quot;הזמנות&quot; (Excel) מ-iPlan</p>
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
