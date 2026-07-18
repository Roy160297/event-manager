"use client";

import { useState } from "react";
import { updateStaffRole } from "./actions";
import type { RoleRow } from "@/lib/types";

export function RoleSelect({ staffId, roleId, roles }: { staffId: string; roleId: string | null; roles: RoleRow[] }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={roleId ?? ""}
        className="rounded-md border border-border-classic bg-surface px-2 py-1.5 text-sm"
        onChange={(e) => {
          setError(null);
          updateStaffRole(staffId, e.target.value).catch((err) => {
            setError(err instanceof Error ? err.message : "שגיאה בעדכון התפקיד");
          });
        }}
      >
        <option value="">— ללא תפקיד —</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
