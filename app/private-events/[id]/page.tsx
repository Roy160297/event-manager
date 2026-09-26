import { createClient } from "@/lib/supabase/server";
import { addSupplier, deleteSupplier, updatePrivateEventDetails, updateSupplier } from "@/app/private-events/actions";
import { actionErrorMessage } from "@/lib/actionError";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { DateField } from "@/components/DateField";
import { TimeField } from "@/components/TimeField";
import { TrashIcon } from "@/components/icons";
import { SupplierImageImport } from "./SupplierImageImport";
import type { PrivateEventGuestRow, PrivateEventRow, PrivateEventSupplierRow, PrivateEventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(PRIVATE_EVENT_TYPE_LABELS) as PrivateEventType[];

export default async function PrivateEventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { count: openTasks }, { data: guestPartySizes }, { data: suppliers }] = await Promise.all([
    supabase.from("private_events").select("*").eq("id", id).returns<PrivateEventRow[]>().single(),
    supabase.from("private_event_tasks").select("*", { count: "exact", head: true }).eq("event_id", id).neq("status", "done"),
    supabase
      .from("private_event_guests")
      .select("party_size")
      .eq("event_id", id)
      .returns<Pick<PrivateEventGuestRow, "party_size">[]>(),
    supabase
      .from("private_event_suppliers")
      .select("*")
      .eq("event_id", id)
      .order("sort_order")
      .returns<PrivateEventSupplierRow[]>(),
  ]);

  const guestListCount = (guestPartySizes ?? []).reduce((sum, guest) => sum + (guest.party_size ?? 1), 0);
  const guestCount = guestListCount || Number(event?.sketch_seated_chairs_count) || 0;

  async function saveDetails(formData: FormData) {
    "use server";
    try {
      await updatePrivateEventDetails(id, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  async function addSupplierAction(formData: FormData) {
    "use server";
    try {
      await addSupplier(id, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";
  const labelClass = "flex flex-col gap-1 text-sm";
  const isBusinessEvent = event?.event_type === "business_event";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-classic bg-surface p-4">
          <p className="text-sm text-foreground/60">משימות פתוחות</p>
          <p className="text-2xl font-bold">{openTasks ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border-classic bg-surface p-4">
          <p className="text-sm text-foreground/60">אורחים</p>
          <p className="text-2xl font-bold">{guestCount}</p>
        </div>
      </div>

      <SaveDetailsForm action={saveDetails} className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
        <p className="font-serif text-lg font-bold">פרטי האירוע</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className="font-medium">שם הלקוח / הזוג</span>
            <input name="name" defaultValue={event?.name} required className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className="font-medium">סוג האירוע</span>
            <select name="event_type" defaultValue={event?.event_type} required className={inputClass}>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRIVATE_EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            <span className="font-medium">שם האולם / מקום האירוע</span>
            <input name="hall_name" defaultValue={event?.hall_name ?? ""} className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className="font-medium">מספר אורחים - התחייבות</span>
            <input
              type="text"
              name="estimated_guests"
              placeholder="לדוגמה: 200+14"
              defaultValue={event?.estimated_guests ?? ""}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className="font-medium">תאריך</span>
            <DateField name="event_date" defaultValue={event?.event_date ?? ""} />
          </label>

          {!isBusinessEvent && (
            <label className={labelClass}>
              <span className="font-medium">תאריך פגישת זוג</span>
              <DateField name="couple_meeting_date" defaultValue={event?.couple_meeting_date ?? ""} />
            </label>
          )}

          <label className={labelClass}>
            <span className="font-medium">שעת התחלה</span>
            <TimeField name="start_time" defaultValue={event?.start_time ?? ""} />
          </label>

          <label className={labelClass}>
            <span className="font-medium">שעת סיום</span>
            <TimeField name="end_time" defaultValue={event?.end_time ?? ""} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <label className={labelClass}>
              <span className="font-medium">אימייל 1</span>
              <input type="email" name="contact_email" defaultValue={event?.contact_email ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className="font-medium">טלפון 1</span>
              <input type="tel" name="contact_phone" defaultValue={event?.contact_phone ?? ""} className={inputClass} />
            </label>
          </div>

          <div className="flex flex-col gap-4">
            <label className={labelClass}>
              <span className="font-medium">אימייל 2</span>
              <input type="email" name="contact_email_2" defaultValue={event?.contact_email_2 ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className="font-medium">טלפון 2</span>
              <input type="tel" name="contact_phone_2" defaultValue={event?.contact_phone_2 ?? ""} className={inputClass} />
            </label>
          </div>

          {!isBusinessEvent && (
            <>
              <label className={labelClass}>
                <span className="font-medium">שמות הורי הכלה</span>
                <input name="bride_parents_names" defaultValue={event?.bride_parents_names ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span className="font-medium">שמות הורי החתן</span>
                <input name="groom_parents_names" defaultValue={event?.groom_parents_names ?? ""} className={inputClass} />
              </label>
            </>
          )}
        </div>

        <label className={labelClass}>
          <span className="font-medium">מידע נוסף</span>
          <textarea name="additional_info" rows={6} defaultValue={event?.additional_info ?? ""} className={inputClass} />
        </label>

        <button
          type="submit"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          שמירת פרטים
        </button>
      </SaveDetailsForm>

      <details open className="rounded-lg border border-border-classic bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium text-accent">ספקים</summary>

        {suppliers && suppliers.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {suppliers.map((supplier) => {
              async function removeSupplier() {
                "use server";
                await deleteSupplier(id, supplier.id);
              }
              async function saveSupplierEdit(formData: FormData) {
                "use server";
                try {
                  await updateSupplier(id, supplier.id, formData);
                } catch (err) {
                  return actionErrorMessage(err);
                }
              }

              return (
                <li key={supplier.id} className="flex flex-col gap-1 border-b border-border-classic pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">
                      {supplier.role && <span className="font-medium">{supplier.role}: </span>}
                      {supplier.name}
                      {supplier.phone && <span className="text-foreground/60"> · {supplier.phone}</span>}
                    </span>
                    <form action={removeSupplier}>
                      <button type="submit" title="מחק ספק" className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">מחק</span>
                      </button>
                    </form>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-accent">ערוך פרטים</summary>
                    <SaveDetailsForm action={saveSupplierEdit} closeDetailsOnSave className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex flex-1 flex-col gap-1 text-sm">
                        <span>תפקיד</span>
                        <input name="role" defaultValue={supplier.role ?? ""} className={inputClass} />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-sm">
                        <span>שם</span>
                        <input name="name" defaultValue={supplier.name} required className={inputClass} />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-sm">
                        <span>טלפון</span>
                        <input name="phone" defaultValue={supplier.phone ?? ""} className={inputClass} />
                      </label>
                      <button type="submit" className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft">
                        שמור
                      </button>
                    </SaveDetailsForm>
                  </details>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-border-classic pt-3">
          <SupplierImageImport eventId={id} />
        </div>

        <SaveDetailsForm
          action={addSupplierAction}
          message="הספק נוסף בהצלחה"
          clearOnSuccess
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span>תפקיד</span>
            <input name="role" placeholder="לדוגמה: צלם" className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span>שם</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span>טלפון</span>
            <input name="phone" className={inputClass} />
          </label>
          <button type="submit" className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft">
            הוסף ספק
          </button>
        </SaveDetailsForm>
      </details>
    </div>
  );
}
