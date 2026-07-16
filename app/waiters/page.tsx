import { createClient } from "@/lib/supabase/server";
import { createWaiter, deleteWaiter, updateWaiter } from "./actions";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { WAITER_ROLE_LABELS } from "@/lib/labels";
import type { WaiterRole, WaiterRow } from "@/lib/types";

const ROLES = Object.keys(WAITER_ROLE_LABELS) as WaiterRole[];
const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";

export default async function WaitersPage() {
  const supabase = await createClient();
  const { data: waiters } = await supabase.from("waiters").select("*").order("name").returns<WaiterRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">מלצרים</h1>
      <p className="text-sm text-foreground/60">
        רשימת המלצרים היא מאגר קבוע המשמש לשיבוץ בכל האירועים — הוסיפו כאן פעם אחת.
      </p>

      <form
        action={createWaiter}
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>שם</span>
          <input name="name" required className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>סוג</span>
          <select name="role" defaultValue="waiter" className={inputClass}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {WAITER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>טלפון</span>
          <input name="phone" className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>הערות</span>
          <input name="notes" className={inputClass} />
        </label>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          הוסף מלצר
        </button>
      </form>

      {(!waiters || waiters.length === 0) && (
        <p className="text-foreground/60">עדיין לא נוספו מלצרים למאגר.</p>
      )}

      <ul className="flex flex-col gap-2">
        {waiters?.map((waiter) => {
          async function remove() {
            "use server";
            await deleteWaiter(waiter.id);
          }
          async function saveEdit(formData: FormData) {
            "use server";
            await updateWaiter(waiter.id, formData);
          }
          return (
            <li
              key={waiter.id}
              className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {waiter.name}{" "}
                    <span className="text-sm font-normal text-foreground/60">
                      ({WAITER_ROLE_LABELS[waiter.role]})
                    </span>
                  </p>
                  <p className="text-sm text-foreground/60">
                    {waiter.phone ?? "—"}
                    {waiter.notes ? ` · ${waiter.notes}` : ""}
                  </p>
                </div>
                <form action={remove}>
                  <button
                    type="submit"
                    title="מחק מלצר"
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">מחק</span>
                  </button>
                </form>
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-medium text-foreground/60">ערוך פרטים</summary>
                <SaveDetailsForm action={saveEdit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>שם</span>
                    <input name="name" defaultValue={waiter.name} required className={inputClass} />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>סוג</span>
                    <select name="role" defaultValue={waiter.role} className={inputClass}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {WAITER_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>טלפון</span>
                    <input name="phone" defaultValue={waiter.phone ?? ""} className={inputClass} />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>הערות</span>
                    <input name="notes" defaultValue={waiter.notes ?? ""} className={inputClass} />
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
    </div>
  );
}
