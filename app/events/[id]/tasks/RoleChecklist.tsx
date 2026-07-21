"use client";

import { useState } from "react";
import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { PdfExportButton } from "@/components/PdfExportButton";
import type { EventType } from "@/lib/types";
import { setRoleChecklistItem } from "./actions";

export default function RoleChecklist({
  checklistKey,
  title,
  categories,
  eventId,
  eventName,
  eventType,
  eventDate,
  canEdit,
  initialCheckedKeys,
}: {
  checklistKey: string;
  title: string;
  categories: ClosingChecklistCategory[];
  eventId: string;
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  canEdit: boolean;
  initialCheckedKeys: string[];
}) {
  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);
  const [checked, setChecked] = useState(() => new Set(initialCheckedKeys));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await setRoleChecklistItem(eventId, checklistKey, itemKey, next);
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

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {title} <span className="text-foreground/60">({checked.size}/{totalItems})</span>
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        {!canEdit && (
          <p className="text-sm text-foreground/60">אפשר לצפות בצ&apos;קליסט, אך רק מי שיש לו/ה הרשאת כתיבה יכול/ה לסמן פריטים.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <PdfExportButton
          filename={`${title}-${eventName}.pdf`}
          eventLabel={`${eventName} · ${eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · ${formatDate(eventDate)}`}
        >
          <ChecklistPrintable title={title} eventName={eventName} eventType={eventType} eventDate={eventDate} categories={categories} checked={checked} />
        </PdfExportButton>

        {categories.map((category) => (
          <div key={category.key} className="flex flex-col gap-2">
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
      </div>
    </details>
  );
}

function ChecklistPrintable({
  title,
  eventName,
  eventType,
  eventDate,
  categories,
  checked,
}: {
  title: string;
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  categories: ClosingChecklistCategory[];
  checked: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">{title}</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {eventName} · {eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · {formatDate(eventDate)}
        </div>
      </div>
      {categories.map((category) => (
        <ul key={category.key} className="flex flex-col gap-1">
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
      ))}
    </div>
  );
}
