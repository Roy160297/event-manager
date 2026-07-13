import { createClient } from "@/lib/supabase/server";
import { createWaiter, deleteWaiter } from "./actions";

export default async function WaitersPage() {
  const supabase = await createClient();
  const { data: waiters } = await supabase.from("waiters").select("*").order("name");

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
          return (
            <li
              key={waiter.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">{waiter.name}</p>
                <p className="text-sm text-neutral-500">
                  {waiter.phone ?? "—"}
                  {waiter.notes ? ` · ${waiter.notes}` : ""}
                </p>
              </div>
              <form action={remove}>
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  מחק
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
