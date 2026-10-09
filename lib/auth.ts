import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES, type PermissionMap } from "@/lib/permissions";
import type { RolePermissionRow } from "@/lib/types";

export interface CurrentStaff {
  id: string;
  name: string;
  email: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: PermissionMap;
}

const NO_PERMISSIONS: PermissionMap = Object.fromEntries(
  RESOURCES.map((resource) => [resource, { read: false, write: false }]),
) as PermissionMap;

// Server-side helper mirroring the RLS policies: reads the caller's staff row
// (and role's permissions) so pages/actions can tailor what they render or
// short-circuit before hitting the database. Not itself a security boundary —
// RLS is what actually enforces access; this only exists to avoid rendering
// controls a user's writes would fail against anyway.
//
// Wrapped in React's cache() because it's called from the root layout AND
// from nearly every nested layout/page in the same request - without this,
// each call re-ran its full auth + staff + role + permissions round trip
// from scratch, multiplying an already-multi-query chain 2-3x per navigation.
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const supabase = await createClient();
  // Local token verification (no Auth-server round trip) - see proxy.ts.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  // One request for the staff row, its role and the role's permissions
  // (embedded) instead of three sequential round trips.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, email, role_id, roles(name, role_permissions(resource, can_read, can_write))")
    .eq("user_id", userId)
    .maybeSingle<{
      id: string;
      name: string;
      email: string | null;
      role_id: string | null;
      roles: { name: string; role_permissions: RolePermissionRow[] } | null;
    }>();
  if (!staff) return null;

  if (!staff.role_id) {
    return { id: staff.id, name: staff.name, email: staff.email, roleId: null, roleName: null, permissions: NO_PERMISSIONS };
  }

  const role = staff.roles;
  const rolePermissions = role?.role_permissions;

  const permissions: PermissionMap = { ...NO_PERMISSIONS };
  for (const perm of rolePermissions ?? []) {
    permissions[perm.resource] = { read: perm.can_read, write: perm.can_write };
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    roleId: staff.role_id,
    roleName: role?.name ?? null,
    permissions,
  };
});
