"use client";

import { useState, useTransition } from "react";
import { setSyncEnabled } from "./actions";

// Saves as soon as it is ticked, like a checklist item.
export function SyncSwitch({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function toggle(next: boolean) {
    setChecked(next);
    setFailed(false);
    startTransition(async () => {
      try {
        await setSyncEnabled(next);
      } catch {
        setChecked(!next);
        setFailed(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
        סנכרון iPlan פעיל
      </label>
      {failed && <p className="text-sm text-red-700">השמירה נכשלה, נסו שוב.</p>}
    </div>
  );
}
