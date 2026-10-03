"use client";

import { useState, type ReactNode } from "react";

// One compact line per table/station: title, assigned-waiter chips, the inline
// assign form (pick a waiter, press שבץ) and, for editors, an "עריכה" toggle that
// opens a full-width edit/delete panel underneath. The panels are
// server-rendered nodes handed in as props so the server actions inside them
// keep working.
export function StaffingRow({
  title,
  chips,
  assignPanel,
  editPanel,
}: {
  title: ReactNode;
  chips: ReactNode;
  assignPanel: ReactNode | null;
  editPanel: ReactNode | null;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-[8rem] shrink-0">{title}</div>
        <div className="flex min-w-[8rem] flex-1 flex-wrap items-center gap-1.5">{chips}</div>
        {assignPanel && <div className="shrink-0">{assignPanel}</div>}
        {editPanel && (
          <button
            type="button"
            onClick={() => setEditOpen((value) => !value)}
            aria-expanded={editOpen}
            className="shrink-0 rounded-full border border-border-classic px-3 py-1 text-xs font-medium hover:bg-accent-soft"
          >
            {editOpen ? "סגור" : "עריכה"}
          </button>
        )}
      </div>
      {editOpen && editPanel && <div className="rounded-md bg-accent-soft/40 p-3">{editPanel}</div>}
    </div>
  );
}
