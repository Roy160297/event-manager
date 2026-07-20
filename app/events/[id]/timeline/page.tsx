import { createClient } from "@/lib/supabase/server";
import {
  addEveningWeddingSchedule,
  addFridayReverseWeddingSchedule,
  addTimelineItem,
  deleteAllTimelineItems,
  deleteTimelineItem,
  updateTimelineItem,
} from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { TimeField } from "@/components/TimeField";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: rawItems }, currentStaff] = await Promise.all([
    supabase.from("timeline_items").select("*").eq("event_id", eventId).order("sort_order", { ascending: true }),
    getCurrentStaff(),
  ]);

  const canReadTimeline = !!currentStaff && canRead(currentStaff.permissions, "timeline");
  const canWriteTimeline = !!currentStaff && canWrite(currentStaff.permissions, "timeline");

  if (!canReadTimeline) return <NoPermissionNotice />;

  // Wedding schedules run past midnight, so a plain time comparison would sort
  // "00:30" before "19:30". Times before 6am are treated as a continuation of
  // the previous night and pushed to the end of the day for sorting purposes.
  function scheduleSortKey(time: string | null): number {
    if (!time) return Infinity;
    const [h, m] = time.split(":").map(Number);
    const minutes = h * 60 + m;
    return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
  }

  const items = rawItems
    ? [...rawItems].sort((a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time))
    : rawItems;

  async function addItem(formData: FormData) {
    "use server";
    await addTimelineItem(eventId, formData);
  }

  async function addEveningDefault() {
    "use server";
    await addEveningWeddingSchedule(eventId);
  }

  async function addFridayReverseDefault() {
    "use server";
    await addFridayReverseWeddingSchedule(eventId);
  }

  async function removeAll() {
    "use server";
    await deleteAllTimelineItems(eventId);
  }

  const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";

  return (
    <div className="flex flex-col gap-6">
      {canWriteTimeline && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4">
          <p className="text-sm text-foreground/60">
            יוצרים לוח זמנים סטנדרטי (קבלת פנים, חופה, מזנונים ועוד) ואז אפשר להתאים אישית.
          </p>
          <div className="flex flex-wrap gap-2">
            <SaveDetailsForm action={addEveningDefault} message="לוח הזמנים נוצר בהצלחה">
              <button
                type="submit"
                className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
              >
                צור לוח זמנים ברירת מחדל - חתונת ערב
              </button>
            </SaveDetailsForm>
            <SaveDetailsForm action={addFridayReverseDefault} message="לוח הזמנים נוצר בהצלחה">
              <button
                type="submit"
                className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
              >
                צור לוח זמנים ברירת מחדל - חתונה הפוכה (יום שישי בצהריים)
              </button>
            </SaveDetailsForm>
            {items && items.length > 0 && (
              <form action={removeAll}>
                <ConfirmSubmitButton
                  message="למחוק את כל השלבים בלוח הזמנים? לא ניתן לשחזר פעולה זו."
                  className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  מחק את כל השלבים
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        </div>
      )}

      {canWriteTimeline && (
        <form
          action={addItem}
          className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
        >
          <p className="text-sm font-medium">שלב חדש בלוח הזמנים</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="label"
              placeholder="לדוגמה: קבלת פנים"
              required
              className="rounded-md border border-border-classic bg-surface px-3 py-2 sm:col-span-2"
            />
            <TimeField name="approx_time" />
            <input
              name="notes"
              placeholder="הערות (לא חובה)"
              className="rounded-md border border-border-classic bg-surface px-3 py-2 sm:col-span-3"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            הוסף ללוח הזמנים
          </button>
        </form>
      )}

      {(!items || items.length === 0) && (
        <p className="text-foreground/60">עדיין לא הוגדר לוח זמנים לאירוע זה.</p>
      )}

      <ol className="flex flex-col gap-2">
        {items?.map((item, index) => {
          async function remove() {
            "use server";
            await deleteTimelineItem(eventId, item.id);
          }
          async function saveEdit(formData: FormData) {
            "use server";
            await updateTimelineItem(eventId, item.id, formData);
          }

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">
                      {item.approx_time ? `${item.approx_time} · ` : ""}
                      {item.label}
                    </p>
                    {item.notes && <p className="text-sm text-foreground/60">{item.notes}</p>}
                  </div>
                </div>
                {canWriteTimeline && (
                  <form action={remove}>
                    <button
                      type="submit"
                      title="מחק שלב"
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">מחק</span>
                    </button>
                  </form>
                )}
              </div>

              {canWriteTimeline && (
                <details className="border-t border-border-classic pt-2">
                  <summary className="cursor-pointer text-xs font-medium text-accent">ערוך שלב</summary>
                  <SaveDetailsForm action={saveEdit} className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input
                      name="label"
                      defaultValue={item.label}
                      required
                      className={`${inputClass} sm:col-span-2`}
                    />
                    <TimeField name="approx_time" defaultValue={item.approx_time ?? ""} />
                    <input
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      placeholder="הערות (לא חובה)"
                      className={`${inputClass} sm:col-span-3`}
                    />
                    <button
                      type="submit"
                      className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft sm:col-span-3"
                    >
                      שמור שינויים
                    </button>
                  </SaveDetailsForm>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
