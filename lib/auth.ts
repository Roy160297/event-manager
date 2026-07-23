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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, email, role_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff) return null;

  if (!staff.role_id) {
    return { id: staff.id, name: staff.name, email: staff.email, roleId: null, roleName: null, permissions: NO_PERMISSIONS };
  }

  const [{ data: role }, { data: rolePermissions }] = await Promise.all([
    supabase.from("roles").select("name").eq("id", staff.role_id).maybeSingle(),
    supabase
      .from("role_permissions")
      .select("resource, can_read, can_write")
      .eq("role_id", staff.role_id)
      .returns<RolePermissionRow[]>(),
  ]);

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
