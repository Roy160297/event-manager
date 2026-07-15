import { createClient } from "@/lib/supabase/server";
import { createWaiter, deleteWaiter, updateWaiter } from "./actions";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { WAITER_ROLE_LABELS } from "@/lib/labels";
import type { WaiterRole, WaiterRow } from "@/lib/types";

const ROLES = Object.keys(WAITER_ROLE_LABELS) as WaiterRole[];

export default async function WaitersPage() {
  const supabase = await createClient();
  const { data: waiters } = await supabase.from("waiters").select("*").order("name").returns<WaiterRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">מלצרים</h1>
      <p className="text-sm text-neutral-500">
        רשימת המלצרים היא מאגר קבוע המשמש לשיבוץ בכל האירועים — הוסיפו כאן פעם אחת.
      </p>

      <form
        action={createWaiter}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-end dark:border-neutral-800"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>שם</span>
          <input
            name="name"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>סוג</span>
          <select
            name="role"
            defaultValue="waiter"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {WAITER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>טלפון</span>
          <input
            name="phone"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>הערות</span>
          <input
            name="notes"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black"
        >
          הוסף מלצר
        </button>
      </form>

      {(!waiters || waiters.length === 0) && (
        <p className="text-neutral-500">עדיין לא נוספו מלצרים למאגר.</p>
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
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {waiter.name}{" "}
                    <span className="text-sm font-normal text-neutral-500">
                      ({WAITER_ROLE_LABELS[waiter.role]})
                    </span>
                  </p>
                  <p className="text-sm text-neutral-500">
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
                <summary className="cursor-pointer text-xs font-medium text-neutral-500">ערוך פרטים</summary>
                <SaveDetailsForm action={saveEdit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>שם</span>
                    <input
                      name="name"
                      defaultValue={waiter.name}
                      required
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>סוג</span>
                    <select
                      name="role"
                      defaultValue={waiter.role}
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {WAITER_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>טלפון</span>
                    <input
                      name="phone"
                      defaultValue={waiter.phone ?? ""}
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>הערות</span>
                    <input
                      name="notes"
                      defaultValue={waiter.notes ?? ""}
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
