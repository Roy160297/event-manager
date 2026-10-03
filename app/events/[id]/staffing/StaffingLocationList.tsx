"use client";

import { useState, type ReactNode } from "react";

// Summary bar + "only unassigned" filter over the pre-rendered location rows.
// Each item is built on the server (it carries its own server actions) and
// handed in as a node; this component just decides which ones to show.
export function StaffingLocationList({
  items,
}: {
  items: { id: string; assigned: boolean; node: ReactNode }[];
}) {
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  const total = items.length;
  const assignedCount = items.filter((item) => item.assigned).length;
  const unassignedCount = total - assignedCount;
  const visible = onlyUnassigned ? items.filter((item) => !item.assigned) : items;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-classic bg-surface px-4 py-2">
        <p className="text-sm font-medium">
          משובצים {assignedCount} מתוך {total}
        </p>
        <button
          type="button"
          onClick={() => setOnlyUnassigned((value) => !value)}
          aria-pressed={onlyUnassigned}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            onlyUnassigned
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border-classic hover:bg-accent-soft"
          }`}
        >
          הצג רק לא משובצים ({unassignedCount})
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-foreground/60">כל השולחנות והעמדות משובצים.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.id} className="rounded-lg border border-border-classic bg-surface px-3 py-2">
              {item.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
