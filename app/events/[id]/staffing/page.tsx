import {
  assignWaiter,
  createLocation,
  deleteLocation,
  quickAddTablesFromGuests,
  unassignWaiter,
  updateLocation,
} from "./actions";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_TYPE_LABELS, WAITER_ROLE_LABELS } from "@/lib/labels";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import TableSketchImportWizard from "./TableSketchImportWizard";
import TableSketchPhoto from "./TableSketchPhoto";
import type { EventRow, GuestRow, LocationRow, LocationType, WaiterAssignmentRow, WaiterRow } from "@/lib/types";

const LOCATION_TYPES = Object.keys(LOCATION_TYPE_LABELS) as LocationType[];

type AssignmentWithWaiter = WaiterAssignmentRow & { waiters: Pick<WaiterRow, "id" | "name" | "role"> | null };

export default async function StaffingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: locationsRaw }, { data: guests }, { data: waiters }, { data: assignments }, { data: event }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("*")
        .eq("event_id", eventId)
        .order("location_type")
        .order("label")
        .returns<LocationRow[]>(),
      supabase
        .from("guests")
        .select("seating_table, party_size")
        .eq("event_id", eventId)
        .returns<Pick<GuestRow, "seating_table" | "party_size">[]>(),
      supabase.from("waiters").select("*").order("role").order("name").returns<WaiterRow[]>(),
      supabase
        .from("waiter_assignments")
        .select("*, waiters(id, name, role)")
        .eq("event_id", eventId)
        .returns<AssignmentWithWaiter[]>(),
      supabase
        .from("events")
        .select("table_sketch_path")
        .eq("id", eventId)
        .single()
        .returns<Pick<EventRow, "table_sketch_path">>(),
    ]);

  // Table labels are numbers ("1".."19") but come back from the DB sorted as
  // text (1, 10, 11, ..., 2, 20, ...); sort numerically within each type so
  // tables display in sequential/chronological order instead.
  const locations = locationsRaw
    ? [...locationsRaw].sort((a, b) => {
        if (a.location_type !== b.location_type) return a.location_type.localeCompare(b.location_type);
        const aNum = Number(a.label);
        const bNum = Number(b.label);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
        return a.label.localeCompare(b.label, "he");
      })
    : locationsRaw;

  const sketchPath = event?.table_sketch_path ?? null;
  const sketchUrl = sketchPath ? supabase.storage.from("event-sketches").getPublicUrl(sketchPath).data.publicUrl : null;
  const isSketchPdf = sketchPath?.toLowerCase().endsWith(".pdf") ?? false;

  const guestCountByTable = new Map<string, number>();
  for (const guest of guests ?? []) {
    if (!guest.seating_table) continue;
    guestCountByTable.set(
      guest.seating_table,
      (guestCountByTable.get(guest.seating_table) ?? 0) + (guest.party_size || 1),
    );
  }

  async function addLocation(formData: FormData) {
    "use server";
    await createLocation(eventId, formData);
  }

  async function quickAddTables() {
    "use server";
    await quickAddTablesFromGuests(eventId);
  }

  return (
    <div className="flex flex-col gap-6">
      <TableSketchPhoto eventId={eventId} sketchUrl={sketchUrl} isPdf={isSketchPdf} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">
          צרו שולחנות אוטומטית מרשימת האורחים המיובאת, או הוסיפו שולחנות/עמדות אוכל ידנית.
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={quickAddTables}>
            <button
              type="submit"
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              צור שולחנות מרשימת האורחים
            </button>
          </form>
          <TableSketchImportWizard eventId={eventId} />
        </div>
      </div>

      <form
        action={addLocation}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-end dark:border-neutral-800"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span>סוג</span>
          <select
            name="location_type"
            defaultValue="table"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOCATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>שם</span>
          <input
            name="label"
            required
            placeholder='לדוגמה: שולחן 5, "עמדת סושי"'
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>קיבולת</span>
          <input
            type="number"
            name="capacity"
            min={0}
            defaultValue={0}
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black"
        >
          הוסף
        </button>
      </form>

      {(!locations || locations.length === 0) && (
        <p className="text-neutral-500">עדיין לא הוגדרו שולחנות או עמדות אוכל.</p>
      )}

      <ul className="flex flex-col gap-3">
        {locations?.map((location) => {
          const assignedToLocation =
            assignments?.filter((a) => a.location_id === location.id) ?? [];
          const assignedWaiterIds = new Set(assignedToLocation.map((a) => a.waiter_id));
          const availableWaiters = waiters?.filter((w) => !assignedWaiterIds.has(w.id)) ?? [];
          const guestCount =
            location.location_type === "table" ? guestCountByTable.get(location.label) ?? 0 : null;

          async function removeLocation() {
            "use server";
            await deleteLocation(eventId, location.id);
          }
          async function addAssignment(formData: FormData) {
            "use server";
            await assignWaiter(eventId, location.id, String(formData.get("waiter_id") ?? ""));
          }
          async function saveLocationEdit(formData: FormData) {
            "use server";
            await updateLocation(eventId, location.id, formData);
          }

          return (
            <li
              key={location.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {location.location_type === "table" ? (
                      `שולחן ${location.label}`
                    ) : (
                      <>
                        {location.label}{" "}
                        <span className="text-sm font-normal text-neutral-500">
                          ({LOCATION_TYPE_LABELS[location.location_type]})
                        </span>
                      </>
                    )}
                  </p>
                  {location.location_type === "table" && (
                    <p className="text-sm text-neutral-500">
                      קיבולת: {location.capacity}
                      {guestCount !== null ? ` · אורחים משובצים: ${guestCount}` : ""}
                    </p>
                  )}
                </div>
                <form action={removeLocation}>
                  <button
                    type="submit"
                    title="מחק"
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">מחק</span>
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {assignedToLocation.map((assignment) => {
                  async function remove() {
                    "use server";
                    await unassignWaiter(eventId, assignment.id);
                  }
                  return (
                    <form key={assignment.id} action={remove}>
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                        title="הסר שיבוץ"
                      >
                        {assignment.waiters?.name}
                        {assignment.waiters?.role === "runner" ? ` (${WAITER_ROLE_LABELS.runner})` : ""} ✕
                      </button>
                    </form>
                  );
                })}

                {availableWaiters.length > 0 && (
                  <form action={addAssignment} className="flex items-center gap-2">
                    <select
                      name="waiter_id"
                      defaultValue=""
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="" disabled>
                        שבץ מלצר...
                      </option>
                      {availableWaiters.map((waiter) => (
                        <option key={waiter.id} value={waiter.id}>
                          {waiter.name} ({WAITER_ROLE_LABELS[waiter.role]})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      שבץ
                    </button>
                  </form>
                )}
              </div>

              <details>
                <summary className="cursor-pointer text-xs font-medium text-neutral-500">ערוך פרטים</summary>
                <SaveDetailsForm action={saveLocationEdit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-sm">
                    <span>סוג</span>
                    <select
                      name="location_type"
                      defaultValue={location.location_type}
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      {LOCATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {LOCATION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>שם</span>
                    <input
                      name="label"
                      defaultValue={location.label}
                      required
                      className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>קיבולת</span>
                    <input
                      type="number"
                      name="capacity"
                      min={0}
                      defaultValue={location.capacity}
                      className="w-24 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
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
