"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { setRolePermission } from "./actions";
import { RESOURCES, RESOURCE_LABELS, type Resource } from "@/lib/permissions";
import type { RolePermissionRow, RoleRow } from "@/lib/types";

export function PermissionGrid({
  roles,
  permissionsByRole,
}: {
  roles: RoleRow[];
  permissionsByRole: Record<string, RolePermissionRow[]>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(roleId: string, resource: Resource, field: "can_read" | "can_write", checked: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await setRolePermission(roleId, resource, field, checked);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בעדכון ההרשאה");
      }
    });
  }

  function isChecked(roleId: string, resource: Resource, field: "can_read" | "can_write") {
    return permissionsByRole[roleId]?.find((p) => p.resource === resource)?.[field] ?? false;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-border-classic">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-classic bg-accent-soft/40">
              <th className="sticky right-0 bg-accent-soft/40 px-3 py-2 text-start font-medium">משאב</th>
              {roles.map((role) => (
                <th key={role.id} colSpan={2} className="border-s border-border-classic px-3 py-2 text-center font-medium">
                  {role.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border-classic text-xs text-foreground/60">
              <th className="sticky right-0 bg-background px-3 py-1"></th>
              {roles.map((role) => (
                <Fragment key={role.id}>
                  <th className="border-s border-border-classic px-2 py-1 font-normal">קריאה</th>
                  <th className="px-2 py-1 font-normal">כתיבה</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((resource) => (
              <tr key={resource} className="border-b border-border-classic last:border-b-0">
                <td className="sticky right-0 bg-background px-3 py-2 font-medium">{RESOURCE_LABELS[resource]}</td>
                {roles.map((role) => (
                  <Fragment key={role.id}>
                    <td className="border-s border-border-classic px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={isChecked(role.id, resource, "can_read")}
                        onChange={(e) => toggle(role.id, resource, "can_read", e.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={isChecked(role.id, resource, "can_write")}
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
