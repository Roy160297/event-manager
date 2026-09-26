import { createClient } from "@/lib/supabase/server";
import { updatePrivateEventDetails } from "@/app/private-events/actions";
import { actionErrorMessage } from "@/lib/actionError";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { DateField } from "@/components/DateField";
import { TimeField } from "@/components/TimeField";
import type { PrivateEventGuestRow, PrivateEventRow, PrivateEventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(PRIVATE_EVENT_TYPE_LABELS) as PrivateEventType[];

export default async function PrivateEventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { count: openTasks }, { data: guestPartySizes }] = await Promise.all([
    supabase.from("private_events").select("*").eq("id", id).returns<PrivateEventRow[]>().single(),
    supabase.from("private_event_tasks").select("*", { count: "exact", head: true }).eq("event_id", id).neq("status", "done"),
    supabase
      .from("private_event_guests")
      .select("party_size")
      .eq("event_id", id)
      .returns<Pick<PrivateEventGuestRow, "party_size">[]>(),
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

          <div className="flex flex-col gap-4">
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
              <span className="font-medium">מספר אורחים - התחייבות</span>
              <input
                type="text"
                name="estimated_guests"
                placeholder="לדוגמה: 200+14"
                defaultValue={event?.estimated_guests ?? ""}
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-4">
            <label className={labelClass}>
              <span className="font-medium">שעת התחלה</span>
              <TimeField name="start_time" defaultValue={event?.start_time ?? ""} />
            </label>

            <label className={labelClass}>
              <span className="font-medium">שעת סיום</span>
              <TimeField name="end_time" defaultValue={event?.end_time ?? ""} />
            </label>

            {!isBusinessEvent && (
              <label className={labelClass}>
                <span className="font-medium">מספר מנות ילדים</span>
                <input type="text" name="kids_meal_count" defaultValue={event?.kids_meal_count ?? ""} className={inputClass} />
              </label>
            )}
          </div>
        </div>

        {!isBusinessEvent && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">פירוט מנות (חלק מתוך מנות ההתחייבות, לא בנוסף)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={labelClass}>
                <span className="font-medium">מנות גלאט</span>
                <input type="number" min={0} name="glat_meal_count" defaultValue={event?.glat_meal_count ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span className="font-medium">מנות צמחוניות</span>
                <input
                  type="number"
                  min={0}
                  name="vegetarian_meal_count"
                  defaultValue={event?.vegetarian_meal_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className="font-medium">מנות טבעוניות</span>
                <input type="number" min={0} name="vegan_meal_count" defaultValue={event?.vegan_meal_count ?? ""} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span className="font-medium">מנות ללא גלוטן</span>
                <input
                  type="number"
                  min={0}
                  name="gluten_free_meal_count"
                  defaultValue={event?.gluten_free_meal_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className="font-medium">ילדים מתחת לגיל 2</span>
                <input
                  type="number"
                  min={0}
                  name="toddlers_under_2_count"
                  defaultValue={event?.toddlers_under_2_count ?? ""}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        )}

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
    </div>
  );
}
