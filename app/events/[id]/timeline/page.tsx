import { createClient } from "@/lib/supabase/server";
import { addTimelineItem, deleteTimelineItem, moveTimelineItem } from "./actions";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  async function addItem(formData: FormData) {
    "use server";
    await addTimelineItem(eventId, formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        action={addItem}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <p className="text-sm font-medium">שלב חדש בציר הזמן</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="label"
            placeholder="לדוגמה: קבלת פנים"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="approx_time"
            placeholder="שעה משוערת (לדוגמה 19:00)"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="notes"
            placeholder="הערות (לא חובה)"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black"
        >
          הוסף לציר הזמן
        </button>
      </form>

      {(!items || items.length === 0) && (
        <p className="text-neutral-500">עדיין לא הוגדר ציר זמן לאירוע זה.</p>
      )}

      <ol className="flex flex-col gap-2">
        {items?.map((item, index) => {
          async function moveUp() {
            "use server";
            await moveTimelineItem(eventId, item.id, "up");
          }
          async function moveDown() {
            "use server";
            await moveTimelineItem(eventId, item.id, "down");
          }
          async function remove() {
            "use server";
            await deleteTimelineItem(eventId, item.id);
          }

          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium dark:bg-neutral-800">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">
                    {item.label}
                    {item.approx_time ? ` · ${item.approx_time}` : ""}
                  </p>
                  {item.notes && <p className="text-sm text-neutral-500">{item.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={moveUp}>
                  <button type="submit" className="text-sm hover:underline" disabled={index === 0}>
                    ▲
                  </button>
                </form>
                <form action={moveDown}>
                  <button
                    type="submit"
                    className="text-sm hover:underline"
                    disabled={index === (items?.length ?? 1) - 1}
                  >
                    ▼
                  </button>
                </form>
                <form action={remove}>
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    מחק
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
