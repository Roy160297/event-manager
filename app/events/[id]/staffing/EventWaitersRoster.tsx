"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearEventWaiters, importEventWaiters, previewEventWaiters } from "./actions";

export interface RosterEntry {
  id: string;
  name: string;
  shiftRole: string | null;
  arrival: string | null;
  end: string | null;
}

// Per-event waiter roster: upload the waitstaff manager's Excel to define who
// is working this event (they're the only ones offered in the assign
// dropdowns below). Waiters missing from the permanent pool are added to it
// by the import, and the notice says who.
export default function EventWaitersRoster({
  eventId,
  roster,
  canWrite,
}: {
  eventId: string;
  roster: RosterEntry[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The picked file stays here while we ask which unknown names to add.
  const [pending, setPending] = useState<{
    file: File;
    total: number;
    unknown: { name: string; phone: string | null; shiftRole: string | null }[];
    selected: Set<string>;
  } | null>(null);

  async function runImport(file: File, addNames: string[]) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("add_names", JSON.stringify(addNames));
    const { total, addedNames, skippedNames } = await importEventWaiters(eventId, formData);
    const parts = [`נטענו ${total} מלצרים לאירוע.`];
    if (addedNames.length > 0) parts.push(`נוספו למאגר המלצרים (${addedNames.length}): ${addedNames.join(", ")}.`);
    if (skippedNames.length > 0) parts.push(`לא נוספו (${skippedNames.length}): ${skippedNames.join(", ")}.`);
    setNotice(parts.join(" "));
    router.refresh();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setPending(null);
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { total, unknown } = await previewEventWaiters(formData);
      if (unknown.length > 0) {
        setPending({ file, total, unknown, selected: new Set(unknown.map((waiter) => waiter.name)) });
      } else {
        await runImport(file, []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setError(null);
    setIsPending(true);
    try {
      await runImport(pending.file, [...pending.selected]);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    } finally {
      setIsPending(false);
    }
  }

  function toggleUnknown(name: string) {
    setPending((current) => {
      if (!current) return current;
      const selected = new Set(current.selected);
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      return { ...current, selected };
    });
  }

  async function handleClear() {
    if (!window.confirm("להסיר את רשימת המלצרים של האירוע? שיבוצים קיימים לא יימחקו.")) return;
    setError(null);
    setNotice(null);
    setIsPending(true);
    try {
      await clearEventWaiters(eventId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהסרת הרשימה");
    } finally {
      setIsPending(false);
    }
  }

  const timeRange = (entry: RosterEntry) =>
    entry.arrival || entry.end ? `${entry.arrival ?? "—"}–${entry.end ?? "—"}` : null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          מלצרי האירוע{roster.length > 0 ? ` (${roster.length})` : ""}
        </h2>
        {canWrite && (
          <div className="flex items-center gap-2">
            <label
              className={`cursor-pointer rounded-full border border-accent px-3 py-1 text-xs font-medium text-accent hover:bg-accent-soft ${
                isPending ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {isPending ? "מעבד..." : roster.length > 0 ? "החלף קובץ מלצרים" : "העלאת קובץ מלצרים (Excel)"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={isPending}
                onChange={handleFileSelected}
              />
            </label>
            {roster.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="rounded-full border border-border-classic px-3 py-1 text-xs hover:bg-accent-soft disabled:opacity-50"
              >
                הסר רשימה
              </button>
            )}
          </div>
        )}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-foreground/60">
          לא הועלתה רשימת מלצרים לאירוע, ולכן בשיבוץ מוצגים כל המלצרים במאגר. העלו קובץ Excel עם עמודות שם מלא,
          טלפון, תפקיד, הגעה וסיום.
        </p>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm text-foreground/70">הצג את הרשימה</summary>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {roster.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{entry.name}</span>
                {entry.shiftRole && <span className="text-foreground/70">{entry.shiftRole}</span>}
                {timeRange(entry) && <span className="text-xs text-foreground/50">{timeRange(entry)}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {pending && (
        <div className="flex flex-col gap-2 rounded-md border border-accent bg-accent-soft/40 p-3 text-sm">
          <p className="font-medium">
            {pending.unknown.length === 1
              ? "מלצר אחד מהקובץ לא מופיע בקטגוריית המלצרים. להוסיף אותו?"
              : `${pending.unknown.length} מלצרים מהקובץ לא מופיעים בקטגוריית המלצרים. להוסיף אותם?`}
          </p>
          <ul className="flex flex-col gap-1">
            {pending.unknown.map((waiter) => (
              <li key={waiter.name}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pending.selected.has(waiter.name)}
                    onChange={() => toggleUnknown(waiter.name)}
                    disabled={isPending}
                  />
                  <span className="font-medium">{waiter.name}</span>
                  {waiter.shiftRole && <span className="text-foreground/70">{waiter.shiftRole}</span>}
                  {waiter.phone && <span className="text-xs text-foreground/50" dir="ltr">{waiter.phone}</span>}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-foreground/60">מי שלא יסומן לא יתווסף לקטגוריית המלצרים ולא ישובץ באירוע.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmPending}
              disabled={isPending}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "מעבד..." : `המשך (${pending.selected.size} יתווספו)`}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={isPending}
              className="rounded-full border border-border-classic px-4 py-1.5 text-xs hover:bg-accent-soft disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {notice && <p className="rounded-md bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
