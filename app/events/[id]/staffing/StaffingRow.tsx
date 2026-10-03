"use client";

import { useState, type ReactNode } from "react";

// One compact line per table/station: title, assigned-waiter chips, and (for
// editors) two small toggles that open a full-width panel underneath - "+ שבץ"
// for the assign form and "⋯" for edit/delete. The panels are server-rendered
// nodes handed in as props so the server actions inside them keep working.
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
  const [open, setOpen] = useState<"assign" | "edit" | null>(null);
  const toggle = (which: "assign" | "edit") => setOpen((current) => (current === which ? null : which));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-[8rem] shrink-0">{title}</div>
        <div className="flex min-w-[8rem] flex-1 flex-wrap items-center gap-1.5">{chips}</div>
        {(assignPanel || editPanel) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {assignPanel && (
              <button
                type="button"
                onClick={() => toggle("assign")}
                aria-expanded={open === "assign"}
                className="rounded-full border border-border-classic px-3 py-1 text-xs font-medium hover:bg-accent-soft"
              >
                {open === "assign" ? "סגור" : "+ שבץ"}
              </button>
            )}
            {editPanel && (
              <button
                type="button"
                onClick={() => toggle("edit")}
                aria-expanded={open === "edit"}
                title="ערוך / מחק"
                className="rounded-full border border-border-classic px-2.5 py-1 text-xs font-bold hover:bg-accent-soft"
              >
                ⋯
              </button>
            )}
          </div>
        )}
      </div>
      {open === "assign" && assignPanel && (
        <div className="rounded-md bg-accent-soft/40 p-2">{assignPanel}</div>
      )}
      {open === "edit" && editPanel && <div className="rounded-md bg-accent-soft/40 p-3">{editPanel}</div>}
    </div>
  );
}
