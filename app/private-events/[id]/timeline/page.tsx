import { createClient } from "@/lib/supabase/server";
import { addTimelineItem, deleteAllTimelineItems, deleteTimelineItem, shiftTimelineFrom, updateTimelineItem } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { TimeField } from "@/components/TimeField";
import { scheduleSortKey } from "@/lib/labels";
import { actionErrorMessage } from "@/lib/actionError";
import type { PrivateEventTimelineItemRow } from "@/lib/types";

export default async function PrivateTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: rawItems } = await supabase
    .from("private_event_timeline_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .returns<PrivateEventTimelineItemRow[]>();

  const items = rawItems ? [...rawItems].sort((a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time)) : rawItems;

  const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";

  async function addItem(formData: FormData) {
    "use server";
    try {
      await addTimelineItem(eventId, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  async function removeAll() {
    "use server";
    await deleteAllTimelineItems(eventId);
  }

  async function shiftFrom(formData: FormData) {
    "use server";
    try {
      await shiftTimelineFrom(eventId, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SaveDetailsForm
        action={addItem}
        message="השלב נוסף בהצלחה"
        clearOnSuccess
        className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
      >
        <p className="text-sm font-medium">שלב חדש בלוח הזמנים</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="label"
            placeholder="לדוגמה: קבלת פנים"
            required
            autoFocus
            className="rounded-md border border-border-classic bg-surface px-3 py-2 sm:col-span-2"
          />
          <TimeField name="approx_time" />
          <input name="notes" placeholder="הערות (לא חובה)" className="rounded-md border border-border-classic bg-surface px-3 py-2 sm:col-span-3" />
        </div>
        <button type="submit" className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
          הוסף ללוח הזמנים
        </button>
      </SaveDetailsForm>

      {items && items.length > 0 && (
        <SaveDetailsForm action={shiftFrom} message="השעות עודכנו בהצלחה" className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
          <p className="text-sm font-medium">הוספת דקות לכל השלבים החל משלב מסוים</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="from_item_id" required defaultValue="" className={`${inputClass} sm:col-span-2`}>
              <option value="" disabled>
                בחרו שלב התחלה
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.approx_time ? `${item.approx_time} · ` : ""}
                  {item.label}
                </option>
              ))}
            </select>
            <input type="number" name="minutes" placeholder="דקות להוספה (למשל 15-, להקדמה)" required className={inputClass} />
          </div>
          <button type="submit" className="self-start rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft">
            עדכן שעות
          </button>
        </SaveDetailsForm>
      )}

      {items && items.length > 0 && (
        <form action={removeAll}>
          <ConfirmSubmitButton
            message="למחוק את כל השלבים בלוח הזמנים? לא ניתן לשחזר פעולה זו."
            className="w-full rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            מחק את כל השלבים
          </ConfirmSubmitButton>
        </form>
      )}

      {(!items || items.length === 0) && <p className="text-foreground/60">עדיין לא הוגדר לוח זמנים לאירוע זה.</p>}

      <ol className="flex flex-col gap-2">
        {items?.map((item, index) => {
          async function remove() {
            "use server";
            await deleteTimelineItem(eventId, item.id);
          }
          async function saveEdit(formData: FormData) {
            "use server";
            try {
              await updateTimelineItem(eventId, item.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }

          return (
            <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4">
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
                <form action={remove}>
                  <button type="submit" title="מחק שלב" className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">מחק</span>
                  </button>
                </form>
              </div>

              <details className="border-t border-border-classic pt-2">
                <summary className="cursor-pointer text-xs font-medium text-accent">ערוך שלב</summary>
                <SaveDetailsForm action={saveEdit} className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input name="label" defaultValue={item.label} required className={`${inputClass} sm:col-span-2`} />
                  <TimeField name="approx_time" defaultValue={item.approx_time ?? ""} />
                  <input name="notes" defaultValue={item.notes ?? ""} placeholder="הערות (לא חובה)" className={`${inputClass} sm:col-span-3`} />
                  <button
                    type="submit"
                    className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft sm:col-span-3"
                  >
                    שמור שינויים
                  </button>
                </SaveDetailsForm>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
