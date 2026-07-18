"use client";

import { useState } from "react";
import { CLOSING_CHECKLIST } from "@/lib/closingChecklist";
import { setClosingChecklistItem } from "./actions";

const TOTAL_ITEMS = CLOSING_CHECKLIST.reduce((sum, category) => sum + category.items.length, 0);

export default function ClosingChecklist({
  eventId,
  initialCheckedKeys,
}: {
  eventId: string;
  initialCheckedKeys: string[];
}) {
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

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        צ&apos;קליסט סגירה - מנהל אירוע{" "}
        <span className="text-foreground/60">
          ({checked.size}/{TOTAL_ITEMS})
        </span>
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
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
                        disabled={pendingKey === item.key}
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
