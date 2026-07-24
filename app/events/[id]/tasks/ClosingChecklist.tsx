"use client";

import { useState } from "react";
import { CLOSING_CHECKLIST } from "@/lib/closingChecklist";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { PdfExportButton } from "@/components/PdfExportButton";
import { ChecklistPrintable } from "@/components/ChecklistPrintable";
import { ChecklistSignBlock } from "@/components/ChecklistSignBlock";
import type { EventType } from "@/lib/types";
import { setClosingChecklistItem, setClosingChecklistNote, signChecklist, unsignChecklist } from "./actions";

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
  isSigned,
  signedByName,
  signedAt,
  signatureData,
  currentStaffName,
}: {
  eventId: string;
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  managerName: string | null;
  canEdit: boolean;
  initialCheckedKeys: string[];
  initialNote?: string | null;
  isSigned: boolean;
  signedByName?: string | null;
  signedAt?: string | null;
  signatureData?: string | null;
  currentStaffName?: string | null;
}) {
  const [checked, setChecked] = useState(() => new Set(initialCheckedKeys));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [noteError, setNoteError] = useState<string | null>(null);

  const canEditNow = canEdit && !isSigned;

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
        {isSigned && <span className="text-green-700"> · נחתם</span>}
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        {!canEdit && !isSigned && (
          <p className="text-sm text-foreground/60">
            אפשר לצפות בצ&apos;קליסט, אך רק מנהל/ת אירוע יכול/ה לסמן פריטים.
          </p>
        )}
        {isSigned && <p className="text-sm text-foreground/60">הצ&apos;קליסט נחתם ונעול לעריכה.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <PdfExportButton
          filename={`צקליסט-סגירה-${eventName}.pdf`}
          eventLabel={`${eventName} · ${eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · ${formatDate(eventDate)}`}
          signerName={managerName}
          storedSignature={signatureData ?? null}
        >
          <ChecklistPrintable
            title="צ'קליסט סגירה - מנהל אירוע"
            eventName={eventName}
            eventType={eventType}
            eventDate={eventDate}
            categories={CLOSING_CHECKLIST}
            checked={checked}
            note={note}
            noteLabel="הערות"
            showCategoryLabels
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
                        disabled={!canEditNow || pendingKey === item.key}
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
            disabled={!canEditNow}
            rows={3}
            placeholder="ניתן לפרט כאן. אם אין מה להוסיף - להשאיר ריק."
            className="rounded-md border border-border-classic bg-surface px-3 py-2 text-sm"
          />
          {noteError && <p className="text-sm text-red-600">{noteError}</p>}
          {canEditNow && (
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

        <div className="border-t border-border-classic pt-3">
          <ChecklistSignBlock
            isSigned={isSigned}
            signedByName={signedByName}
            signedAt={signedAt}
            signatureData={signatureData}
            canEdit={canEdit}
            defaultSignerName={currentStaffName ?? managerName}
            onSign={(name, signature) => signChecklist(eventId, "closing_checklist", name, signature)}
            onUnsign={() => unsignChecklist(eventId, "closing_checklist")}
          />
        </div>
      </div>
    </details>
  );
}
