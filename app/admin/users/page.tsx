import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { TrashIcon } from "@/components/icons";
import type { RoleRow, StaffRow } from "@/lib/types";
import { addStaff, removeStaff, updateStaffDetails } from "./actions";
import { RoleSelect } from "./RoleSelect";

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: staff }, { data: roles }] = await Promise.all([
    supabase.from("staff").select("*").order("created_at").returns<StaffRow[]>(),
    supabase.from("roles").select("*").order("name").returns<RoleRow[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <form
        action={addStaff}
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end sm:flex-wrap"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span>שם</span>
          <input name="name" required className="rounded-md border border-border-classic bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>אימייל (Google)</span>
          <input
            type="email"
            name="email"
            required
            placeholder="name@gmail.com"
            className="rounded-md border border-border-classic bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>טלפון</span>
          <input name="phone" className="rounded-md border border-border-classic bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>תפקיד</span>
          <select name="role_id" defaultValue="" className="rounded-md border border-border-classic bg-surface px-3 py-2">
            <option value="">— ללא תפקיד —</option>
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          + הוסף איש/אשת צוות
        </button>
      </form>

      <p className="text-sm text-foreground/60">
        רק כתובות אימייל שרשומות כאן יוכלו להתחבר עם Google. הוספת שורה כאן היא הדרך היחידה לאשר גישה למשתמש חדש.
      </p>

      {!staff || staff.length === 0 ? (
        <p className="text-foreground/60">עדיין לא הוגדרו אנשי צוות.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {staff.map((member) => {
            async function save(formData: FormData) {
              "use server";
              await updateStaffDetails(member.id, formData);
            }
            async function remove() {
              "use server";
              await removeStaff(member.id);
            }
            return (
              <li key={member.id} className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-foreground/60">{member.email ?? "— אין אימייל, לא ניתן להתחבר —"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        member.user_id ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {member.user_id ? "התחבר/ה בעבר" : "טרם התחבר/ה"}
                    </span>
                    <RoleSelect staffId={member.id} roleId={member.role_id} roles={roles ?? []} />
                    <form action={remove}>
                      <ConfirmSubmitButton
                        message={`להסיר את "${member.name}"? הגישה למערכת תישלל מיידית.`}
                        title="הסר"
                        className="rounded-md p-2 text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">הסר</span>
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>

                <details>
                  <summary className="cursor-pointer text-xs font-medium text-foreground/60">ערוך פרטים</summary>
                  <SaveDetailsForm action={save} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1 text-sm">
                      <span>שם</span>
                      <input
                        name="name"
                        defaultValue={member.name}
                        required
                        className="rounded-md border border-border-classic bg-surface px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-sm">
                      <span>אימייל</span>
                      <input
                        type="email"
                        name="email"
                        defaultValue={member.email ?? ""}
                        required
                        className="rounded-md border border-border-classic bg-surface px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span>טלפון</span>
                      <input
                        name="phone"
                        defaultValue={member.phone ?? ""}
                        className="rounded-md border border-border-classic bg-surface px-3 py-2"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
                    >
                      שמור
                    </button>
                  </SaveDetailsForm>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
