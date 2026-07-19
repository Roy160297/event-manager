import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { SubmitButton } from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import type { RolePermissionRow, RoleRow } from "@/lib/types";
import { createRole, deleteRole, renameRole } from "./actions";
import { PermissionGrid } from "./PermissionGrid";

export default async function RolesPage() {
  const supabase = await createClient();

  const [{ data: roles }, { data: permissions }] = await Promise.all([
    supabase.from("roles").select("*").order("created_at").returns<RoleRow[]>(),
    supabase.from("role_permissions").select("*").returns<RolePermissionRow[]>(),
  ]);

  const permissionsByRole: Record<string, RolePermissionRow[]> = {};
  for (const perm of permissions ?? []) {
    (permissionsByRole[perm.role_id] ??= []).push(perm);
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={createRole} className="flex flex-wrap items-end gap-3 rounded-lg border border-border-classic bg-surface p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>שם התפקיד</span>
          <input
            name="name"
            required
            placeholder='לדוגמה: "מלצר בכיר", "מנהל אירועים"'
            className="rounded-md border border-border-classic bg-surface px-3 py-2"
          />
        </label>
        <SubmitButton className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60">
          + תפקיד חדש
        </SubmitButton>
      </form>

      {!roles || roles.length === 0 ? (
        <p className="text-foreground/60">עדיין לא הוגדרו תפקידים.</p>
      ) : (
        <>
          <PermissionGrid roles={roles} permissionsByRole={permissionsByRole} />

          <ul className="flex flex-col gap-2">
            {roles.map((role) => {
              async function save(formData: FormData) {
                "use server";
                await renameRole(role.id, formData);
              }
              async function remove() {
                "use server";
                await deleteRole(role.id);
              }
              return (
                <li key={role.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-3">
                  <SaveDetailsForm action={save} className="flex flex-1 items-center gap-2">
                    <input
                      name="name"
                      defaultValue={role.name}
                      required
                      className="flex-1 rounded-md border border-border-classic bg-surface px-3 py-1.5 text-sm"
                    />
                    <button type="submit" className="rounded-full border border-border-classic px-3 py-1.5 text-sm hover:bg-accent-soft">
                      שמור שם
                    </button>
                  </SaveDetailsForm>
                  <form action={remove}>
                    <ConfirmSubmitButton
                      message={`למחוק את התפקיד "${role.name}"? משתמשים עם תפקיד זה יאבדו את כל ההרשאות שלהם.`}
                      title="מחק תפקיד"
                      className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">מחק</span>
                    </ConfirmSubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
