"use client";

import { Fragment, useState } from "react";
import { setRolePermission } from "./actions";
import type { RolePermissionRow, RoleRow } from "@/lib/types";

type ResourceOption = { key: string; label: string };
type PermissionsState = Record<string, Record<string, { can_read: boolean; can_write: boolean }>>;

function buildInitialState(
  roles: RoleRow[],
  permissionsByRole: Record<string, RolePermissionRow[]>,
  resources: ResourceOption[],
): PermissionsState {
  const state: PermissionsState = {};
  for (const role of roles) {
    state[role.id] = Object.fromEntries(
      resources.map(({ key: resource }) => {
        const perm = permissionsByRole[role.id]?.find((p) => p.resource === resource);
        return [resource, { can_read: perm?.can_read ?? false, can_write: perm?.can_write ?? false }];
      }),
    ) as PermissionsState[string];
  }
  return state;
}

export function PermissionGrid({
  roles,
  permissionsByRole,
  resources,
  readOnly = false,
}: {
  roles: RoleRow[];
  permissionsByRole: Record<string, RolePermissionRow[]>;
  resources: ResourceOption[];
  readOnly?: boolean;
}) {
  const [state, setState] = useState<PermissionsState>(() => buildInitialState(roles, permissionsByRole, resources));
  const [error, setError] = useState<string | null>(null);

  // Optimistic: flip the checkbox immediately and persist in the background;
  // only touch the UI again if the save actually fails, so ticking through a
  // grid of checkboxes doesn't wait on a round-trip per click.
  function toggle(roleId: string, resource: string, field: "can_read" | "can_write", checked: boolean) {
    if (readOnly) return;
    setError(null);
    setState((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], [resource]: { ...prev[roleId][resource], [field]: checked } },
    }));

    setRolePermission(roleId, resource, field, checked).catch((err) => {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון ההרשאה");
      setState((prev) => ({
        ...prev,
        [roleId]: { ...prev[roleId], [resource]: { ...prev[roleId][resource], [field]: !checked } },
      }));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-grid-line">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-line bg-accent-soft/40">
              <th className="sticky right-0 bg-accent-soft/40 px-3 py-2 text-start font-medium">קטגוריה</th>
              {roles.map((role) => (
                <th key={role.id} colSpan={2} className="border-s border-grid-line px-3 py-2 text-center font-medium">
                  {role.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-grid-line text-xs text-foreground/60">
              <th className="sticky right-0 bg-background px-3 py-1"></th>
              {roles.map((role) => (
                <Fragment key={role.id}>
                  <th className="border-s border-grid-line px-2 py-1 font-normal">קריאה</th>
                  <th className="border-s border-grid-line px-2 py-1 font-normal">כתיבה</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map(({ key: resource, label }) => (
              <tr key={resource} className="border-b border-grid-line last:border-b-0">
                <td className="sticky right-0 bg-background px-3 py-2 font-medium">{label}</td>
                {roles.map((role) => (
                  <Fragment key={role.id}>
                    <td className="border-s border-grid-line px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={state[role.id][resource].can_read}
                        disabled={readOnly}
                        onChange={(e) => toggle(role.id, resource, "can_read", e.target.checked)}
                      />
                    </td>
                    <td className="border-s border-grid-line px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={state[role.id][resource].can_write}
                        disabled={readOnly}
                        onChange={(e) => toggle(role.id, resource, "can_write", e.target.checked)}
                      />
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
