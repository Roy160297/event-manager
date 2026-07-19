"use client";

import { useState } from "react";
import { setRoleEventManagerFlag } from "./actions";

export function EventManagerToggle({ roleId, initialValue }: { roleId: string; initialValue: boolean }) {
  const [checked, setChecked] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-xs text-foreground/70">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const next = e.target.checked;
            setError(null);
            setChecked(next);
            setRoleEventManagerFlag(roleId, next).catch((err) => {
              setChecked(!next);
              setError(err instanceof Error ? err.message : "שגיאה בעדכון");
            });
          }}
        />
        יכול/ה להיות מנהל/ת אירוע אחראי/ת
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
