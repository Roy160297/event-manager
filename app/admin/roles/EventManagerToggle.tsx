"use client";

import { useState } from "react";
import { setRoleFlag, type RoleFlag } from "./actions";

const FLAG_LABELS: Record<RoleFlag, string> = {
  can_be_event_manager: "יכול/ה להיות מנהל/ת אירוע אחראי/ת",
  can_be_floor_manager: "יכול/ה להיות מנהל/ת פלור",
  can_be_salesperson: "יכול/ה להיות איש/ת מכירות",
};

// One checkbox of a role: whether its people are offered in the matching
// dropdown on an event (event manager, floor manager, salesperson).
export function RoleFlagToggle({ roleId, flag, initialValue }: { roleId: string; flag: RoleFlag; initialValue: boolean }) {
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
            setRoleFlag(roleId, flag, next).catch((err) => {
              setChecked(!next);
              setError(err instanceof Error ? err.message : "שגיאה בעדכון");
            });
          }}
        />
        {FLAG_LABELS[flag]}
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
