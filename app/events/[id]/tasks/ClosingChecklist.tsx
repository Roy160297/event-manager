"use client";

import { useState } from "react";
import { CLOSING_CHECKLIST } from "@/lib/closingChecklist";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { PdfExportButton } from "@/components/PdfExportButton";
import type { EventType } from "@/lib/types";
import { setClosingChecklistItem, setClosingChecklistNote } from "./actions";

const TOTAL_ITEMS = CLOSING_CHECKLIST.reduce((sum, category) => sum + category.items.length, 0);

export default function ClosingChecklist({
  eventId,
  eventName,
  eventType,
  eventDate,
  managerName,
  canEdit,
  initialCheckedKeys,
  initialNote,
}: {
  eventId: string;
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  managerName: string | null;
  canEdit: boolean;
  initialCheckedKeys: string[];
  initialNote?: string | null;
}) {
  const [checked, setChecked] = useState(() => new Set(initialCheckedKeys));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [noteError, setNoteError] = useState<string | null>(null);

  async function toggle(itemKey: string, next: boolean) {
    setError(null);
    setChecked((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(itemKey);
      else copy.delete(itemKey);
      return copy;
    });
    setPendingKey(itemKey);
    try {
      await setClosingChecklistItem(eventId, itemKey, next);
    } catch (err) {
      setChecked((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(itemKey);
        else copy.add(itemKey);
        return copy;
      });
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setPendingKey(null);
    }
  }

  async function saveNote() {
    setNoteError(null);
    setNoteStatus("saving");
    try {
      await setClosingChecklistNote(eventId, note);
      setNoteStatus("saved");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "שגיאה בשמירה");
      setNoteStatus("idle");
    }
  }

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        צ&apos;קליסט סגירה - מנהל אירוע{" "}
        <span className="text-foreground/60">
          ({checked.size}/{TOTAL_ITEMS})
        </span>
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        {!canEdit && (
          <p className="text-sm text-foreground/60">
            אפשר לצפות בצ&apos;קליסט, אך רק מנהל/ת אירוע יכול/ה לסמן פריטים.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <PdfExportButton
          filename={`צקליסט-סגירה-${eventName}.pdf`}
          eventLabel={`${eventName} · ${eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · ${formatDate(eventDate)}`}
          signerName={managerName}
        >
          <ChecklistPrintable
            eventName={eventName}
            eventType={eventType}
            eventDate={eventDate}
            checked={checked}
            note={note}
          />
        </PdfExportButton>

        {CLOSING_CHECKLIST.map((category) => (
          <div key={category.key} className="flex flex-col gap-2">
            <p className="text-sm font-semibold underline">{category.label}</p>
            <ul className="flex flex-col gap-1.5">
              {category.items.map((item) => {
                const isChecked = checked.has(item.key);
                return (
                  <li key={item.key}>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!canEdit || pendingKey === item.key}
                        onChange={(e) => toggle(item.key, e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className={isChecked ? "text-foreground/50 line-through" : ""}>{item.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="flex flex-col gap-2 border-t border-border-classic pt-3">
          <p className="text-sm font-medium">הערות</p>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteStatus("idle");
            }}
            disabled={!canEdit}
            rows={3}
            placeholder="ניתן לפרט כאן. אם אין מה להוסיף - להשאיר ריק."
            className="rounded-md border border-border-classic bg-surface px-3 py-2 text-sm"
          />
          {noteError && <p className="text-sm text-red-600">{noteError}</p>}
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveNote}
                disabled={noteStatus === "saving"}
                className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
              >
                {noteStatus === "saving" ? "שומר..." : "שמור"}
              </button>
              {noteStatus === "saved" && <span className="text-xs text-foreground/60">נשמר</span>}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function ChecklistPrintable({
  eventName,
  eventType,
  eventDate,
  checked,
  note,
}: {
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  checked: Set<string>;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">צ&apos;קליסט סגירה - מנהל אירוע</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {eventName} · {eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · {formatDate(eventDate)}
        </div>
      </div>
      {CLOSING_CHECKLIST.map((category) => (
        <div key={category.key} className="flex flex-col gap-1.5">
          <p className="text-sm font-bold underline">{category.label}</p>
          <ul className="flex flex-col gap-1">
            {category.items.map((item) => (
              <li key={item.key} className="flex items-start gap-2 text-[12.5px]">
                <span
                  className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] text-[10px] leading-none"
                  style={{ border: "1px solid #737373" }}
                >
                  {checked.has(item.key) ? "✓" : ""}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {note != null && (
        <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid #d4d4d4" }}>
          <p className="text-sm font-bold">הערות</p>
          <p className="text-[12.5px]" style={{ color: note ? "#000000" : "#737373" }}>
            {note || "אין הערות"}
          </p>
        </div>
      )}
    </div>
  );
}
