import { createClient } from "@/lib/supabase/server";
import { updateEventDetails, addSupplier, updateSupplier, deleteSupplier } from "@/app/events/actions";
import { actionErrorMessage } from "@/lib/actionError";
import { EVENT_TYPE_LABELS, formatDate, formatTime } from "@/lib/labels";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { TrashIcon } from "@/components/icons";
import { DateField } from "@/components/DateField";
import { TimeField } from "@/components/TimeField";
import { getCurrentStaff } from "@/lib/auth";
import { getEventManagerCandidates, getFloorManagerCandidates, getSalespersonCandidates } from "@/lib/staff";
import { canRead, canWrite } from "@/lib/permissions";
import { EventFormExport } from "./EventFormExport";
import { SupplierImageImport } from "./SupplierImageImport";
import { ImageUpdateWizard } from "./ImageUpdateWizard";
import { WelcomeEmailPrompt } from "./WelcomeEmailPrompt";
import { SendWelcomeEmailButton } from "./SendWelcomeEmailButton";
import { SendWhatsAppButton } from "./SendWhatsAppButton";
import { WELCOME_EMAIL_SUBJECT, buildWelcomeEmailBody } from "@/lib/welcomeEmail";
import type { EventRow, EventSupplierRow, EventType, GuestRow, TimelineItemRow } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ newEvent?: string }>;
}) {
  const { id } = await params;
  const { newEvent } = await searchParams;
  const supabase = await createClient();

  const [
    { data: event },
    { count: openTasks },
    { data: guestPartySizes },
    managers,
    floorManagers,
    salespeople,
    { data: suppliers },
    { data: scheduleItems },
    currentStaff,
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).returns<EventRow[]>().single(),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .neq("status", "done"),
    supabase.from("guests").select("party_size").eq("event_id", id).returns<Pick<GuestRow, "party_size">[]>(),
    getEventManagerCandidates(),
    getFloorManagerCandidates(),
    getSalespersonCandidates(),
    supabase
      .from("event_suppliers")
      .select("*")
      .eq("event_id", id)
      .order("sort_order")
      .returns<EventSupplierRow[]>(),
    supabase
      .from("timeline_items")
      .select("label, approx_time, notes")
      .eq("event_id", id)
      .returns<Pick<TimelineItemRow, "label" | "approx_time" | "notes">[]>(),
    getCurrentStaff(),
  ]);

  const canReadEvents = !!currentStaff && canRead(currentStaff.permissions, "events");
  const canWriteEvents = !!currentStaff && canWrite(currentStaff.permissions, "events");

  if (!canReadEvents) return <NoPermissionNotice />;

  // Sum of party_size, not row count - a "guest" row is a seated party
  // (often 2+ people sharing a table), so counting rows undercounts the
  // real headcount whenever any party has more than one seat.
  const guestCount = (guestPartySizes ?? []).reduce((sum, guest) => sum + (guest.party_size ?? 1), 0);

  const assignedManager = managers?.find((manager) => manager.id === event?.manager_id) ?? null;
  const managerName = assignedManager?.name ?? null;
  const floorManagerName = floorManagers?.find((manager) => manager.id === event?.floor_manager_id)?.name ?? null;
  const salespersonName = salespeople?.find((person) => person.id === event?.sales_person_id)?.name ?? null;

  // Falls back to whoever's viewing (the creator, in practice) when no event
  // manager is assigned yet, so the email still signs off as a real person.
  const welcomeEmailSenderName = assignedManager?.name ?? currentStaff?.name ?? "";
  const welcomeEmailSenderPhone = assignedManager?.phone ?? null;
  const showWelcomeEmailPrompt =
    newEvent === "1" && canWriteEvents && !!event && (!!event.contact_email || !!event.contact_email_2);

  async function saveDetails(formData: FormData) {
    "use server";
    try {
      await updateEventDetails(id, formData);
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

  return (
    <div className="flex flex-col gap-6">
      {showWelcomeEmailPrompt && event && (
        <WelcomeEmailPrompt
          eventId={id}
          to1={event.contact_email}
          to2={event.contact_email_2}
          defaultSubject={WELCOME_EMAIL_SUBJECT}
          defaultBody={buildWelcomeEmailBody(welcomeEmailSenderName, welcomeEmailSenderPhone)}
        />
      )}

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

      {event && (
        <EventFormExport
          event={event}
          managerName={managerName}
          floorManagerName={floorManagerName}
          salespersonName={salespersonName}
          suppliers={suppliers ?? []}
          scheduleItems={scheduleItems ?? []}
        />
      )}

      {canWriteEvents && (
        <ImageUpdateWizard eventId={id} managers={managers ?? []} salespeople={salespeople ?? []} />
      )}

      {canWriteEvents && event && (
        <div className="flex flex-wrap gap-3">
          <SendWelcomeEmailButton
            eventId={id}
            to1={event.contact_email}
            to2={event.contact_email_2}
            defaultSubject={WELCOME_EMAIL_SUBJECT}
            defaultBody={buildWelcomeEmailBody(welcomeEmailSenderName, welcomeEmailSenderPhone)}
          />
          <SendWhatsAppButton
            to1={event.contact_phone}
            to2={event.contact_phone_2}
            defaultMessage={buildWelcomeEmailBody(welcomeEmailSenderName, welcomeEmailSenderPhone)}
          />
        </div>
      )}

      {canWriteEvents ? (
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
                    {EVENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-4">
              <label className={labelClass}>
                <span className="font-medium">תאריך</span>
                <DateField name="event_date" defaultValue={event?.event_date ?? ""} />
              </label>

              {event?.event_type !== "business_event" && (
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
                  placeholder='לדוגמה: 200+14'
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
                <span className="font-medium">שעת סיום (ע&quot;פ חוזה)</span>
                <TimeField name="end_time" defaultValue={event?.end_time ?? ""} />
              </label>

              {event?.event_type !== "business_event" && (
                <label className={labelClass}>
                  <span className="font-medium">מספר מנות ילדים</span>
                  <input
                    type="text"
                    name="kids_meal_count"
                    defaultValue={event?.kids_meal_count ?? ""}
                    className={inputClass}
                  />
                </label>
              )}
            </div>
          </div>

          {event?.event_type !== "business_event" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">פירוט מנות (חלק מתוך מנות ההתחייבות, לא בנוסף)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>
                  <span className="font-medium">מנות גלאט</span>
                  <input
                    type="number"
                    min={0}
                    name="glat_meal_count"
                    defaultValue={event?.glat_meal_count ?? ""}
                    className={inputClass}
                  />
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
                  <input
                    type="number"
                    min={0}
                    name="vegan_meal_count"
                    defaultValue={event?.vegan_meal_count ?? ""}
                    className={inputClass}
                  />
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

            <label className={labelClass}>
              <span className="font-medium">מנהל/ת אירוע אחראי/ת</span>
              <select name="manager_id" defaultValue={event?.manager_id ?? ""} className={inputClass}>
                <option value="">ללא אחראי</option>
                {managers?.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span className="font-medium">מנהל/ת פלור</span>
              <select name="floor_manager_id" defaultValue={event?.floor_manager_id ?? ""} className={inputClass}>
                <option value="">ללא אחראי</option>
                {floorManagers?.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span className="font-medium">איש/ת מכירות</span>
              <select name="sales_person_id" defaultValue={event?.sales_person_id ?? ""} className={inputClass}>
                <option value="">ללא אחראי</option>
                {salespeople?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>

            {event?.event_type !== "business_event" && (
              <>
                <label className={labelClass}>
                  <span className="font-medium">שמות הורי הכלה</span>
                  <input
                    name="bride_parents_names"
                    defaultValue={event?.bride_parents_names ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  <span className="font-medium">שמות הורי החתן</span>
                  <input
                    name="groom_parents_names"
                    defaultValue={event?.groom_parents_names ?? ""}
                    className={inputClass}
                  />
                </label>
              </>
            )}
          </div>

          <label className={labelClass}>
            <span className="font-medium">מידע נוסף</span>
            <textarea name="menu_notes" rows={2} defaultValue={event?.menu_notes ?? ""} className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className="font-medium">הערות חניה</span>
            <textarea name="parking_notes" rows={2} defaultValue={event?.parking_notes ?? ""} className={inputClass} />
          </label>

          <button
            type="submit"
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            שמירת פרטים
          </button>
        </SaveDetailsForm>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
          <p className="font-serif text-lg font-bold">פרטי האירוע</p>
          <div className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {(
              [
                ["שם הלקוח / הזוג", event?.name ?? null],
                ["סוג האירוע", event ? EVENT_TYPE_LABELS[event.event_type] : null],
                ["תאריך", event ? formatDate(event.event_date) : null],
                ["מספר אורחים - התחייבות", event?.estimated_guests ?? null],
                ["שעת התחלה", event ? formatTime(event.start_time) : null],
                ['שעת סיום (ע"פ חוזה)', event ? formatTime(event.end_time) : null],
                ...(event?.event_type !== "business_event"
                  ? ([
                      ["תאריך פגישת זוג", event ? formatDate(event.couple_meeting_date) : null],
                      ["מספר מנות ילדים", event?.kids_meal_count ?? null],
                      ["מנות גלאט", event?.glat_meal_count ?? null],
                      ["מנות צמחוניות", event?.vegetarian_meal_count ?? null],
                      ["מנות טבעוניות", event?.vegan_meal_count ?? null],
                      ["מנות ללא גלוטן", event?.gluten_free_meal_count ?? null],
                      ["ילדים מתחת לגיל 2", event?.toddlers_under_2_count ?? null],
                    ] as [string, string | null][])
                  : []),
                ["אימייל 1", event?.contact_email ?? null],
                ["טלפון 1", event?.contact_phone ?? null],
                ["אימייל 2", event?.contact_email_2 ?? null],
                ["טלפון 2", event?.contact_phone_2 ?? null],
                ["מנהל/ת אירוע אחראי/ת", managerName],
                ["מנהל/ת פלור", floorManagerName],
                ["איש/ת מכירות", salespersonName],
                ...(event?.event_type !== "business_event"
                  ? ([
                      ["שמות הורי הכלה", event?.bride_parents_names ?? null],
                      ["שמות הורי החתן", event?.groom_parents_names ?? null],
                    ] as [string, string | null][])
                  : []),
              ] as [string, string | null][]
            ).map(([label, value]) => (
              <p key={label}>
                <span className="text-foreground/60">{label}: </span>
                {value || "—"}
              </p>
            ))}
          </div>

          {event?.menu_notes && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">מידע נוסף</span>
              <p className="whitespace-pre-wrap">{event.menu_notes}</p>
            </div>
          )}

          {event?.parking_notes && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">הערות חניה</span>
              <p className="whitespace-pre-wrap">{event.parking_notes}</p>
            </div>
          )}
        </div>
      )}

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
                    {canWriteEvents && (
                      <form action={removeSupplier}>
                        <button
                          type="submit"
                          title="מחק ספק"
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">מחק</span>
                        </button>
                      </form>
                    )}
                  </div>
                  {canWriteEvents && (
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-accent">ערוך פרטים</summary>
                      <SaveDetailsForm
                        action={saveSupplierEdit}
                        closeDetailsOnSave
                        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
                      >
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
                        <button
                          type="submit"
                          className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
                        >
                          שמור
                        </button>
                      </SaveDetailsForm>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canWriteEvents && (
          <div className="mt-4 border-t border-border-classic pt-3">
            <SupplierImageImport eventId={id} />
          </div>
        )}

        {canWriteEvents && (
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
            <button
              type="submit"
              className="rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
            >
              הוסף ספק
            </button>
          </SaveDetailsForm>
        )}
      </details>
    </div>
  );
}
