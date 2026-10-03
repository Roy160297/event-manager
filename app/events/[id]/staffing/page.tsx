import { assignWaiter, createLocation, deleteAllLocations, deleteLocation, unassignWaiter, updateLocation } from "./actions";
import { AssignWaiterForm } from "./AssignWaiterForm";
import { createClient } from "@/lib/supabase/server";
import { actionErrorMessage } from "@/lib/actionError";
import { ASSIGNMENT_ROLE_LABELS, LOCATION_TYPE_LABELS } from "@/lib/labels";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import TableSketchPhoto from "./TableSketchPhoto";
import { StaffingLocationList } from "./StaffingLocationList";
import { StaffingRow } from "./StaffingRow";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import type {
  EventRow,
  GuestRow,
  LocationRow,
  LocationType,
  WaiterAssignmentRow,
  WaiterRole,
  WaiterRow,
  WaiterSkill,
  WaiterSkillRow,
} from "@/lib/types";

const LOCATION_TYPES = Object.keys(LOCATION_TYPE_LABELS) as LocationType[];

type AssignmentWithWaiter = WaiterAssignmentRow & { waiters: Pick<WaiterRow, "id" | "name"> | null };

export default async function StaffingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [
    { data: locationsRaw },
    { data: guests },
    { data: waiters },
    { data: waiterSkills },
    { data: assignments },
    { data: event },
    currentStaff,
  ] = await Promise.all([
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
    supabase.from("waiters").select("*").order("name").returns<WaiterRow[]>(),
    supabase.from("waiter_skills").select("*").returns<WaiterSkillRow[]>(),
    supabase
      .from("waiter_assignments")
      .select("*, waiters(id, name)")
      .eq("event_id", eventId)
      .returns<AssignmentWithWaiter[]>(),
    supabase
      .from("events")
      .select("table_sketch_path, sketch_seated_chairs_count")
      .eq("id", eventId)
      .single()
      .returns<Pick<EventRow, "table_sketch_path" | "sketch_seated_chairs_count">>(),
    getCurrentStaff(),
  ]);

  const skillsByWaiter: Record<string, WaiterSkill[]> = {};
  for (const row of waiterSkills ?? []) {
    (skillsByWaiter[row.waiter_id] ??= []).push(row.skill);
  }

  const canReadStaffing = !!currentStaff && canRead(currentStaff.permissions, "staffing");
  const canWriteStaffing = !!currentStaff && canWrite(currentStaff.permissions, "staffing");

  if (!canReadStaffing) return <NoPermissionNotice />;

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
  const sketchUrl = sketchPath
    ? ((await supabase.storage.from("event-sketches").createSignedUrl(sketchPath, 60 * 60)).data?.signedUrl ?? null)
    : null;
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

  async function removeAllLocations() {
    "use server";
    await deleteAllLocations(eventId);
  }

  return (
    <div className="flex flex-col gap-6">
      <TableSketchPhoto
        eventId={eventId}
        sketchUrl={sketchUrl}
        isPdf={isSketchPdf}
        canWrite={canWriteStaffing}
        seatedChairsCount={event?.sketch_seated_chairs_count ?? null}
      />

      {canWriteStaffing && (
        <details className="rounded-lg border border-border-classic bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">הוספה וניהול שולחנות ועמדות</summary>
          <div className="flex flex-col gap-3 border-t border-border-classic p-4">
        <form
          action={addLocation}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span>סוג</span>
            <select
              name="location_type"
              defaultValue="table"
              className="rounded-md border border-border-classic bg-surface px-3 py-2"
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
              className="rounded-md border border-border-classic bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>קיבולת</span>
            <input
              type="number"
              name="capacity"
              min={0}
              defaultValue={0}
              className="w-24 rounded-md border border-border-classic bg-surface px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            הוסף
          </button>
        </form>
            {locations && locations.length > 0 && (
        <form action={removeAllLocations}>
          <ConfirmSubmitButton
            message="למחוק את כל השולחנות והעמדות של האירוע? כל שיבוץ מלצרים קיים יימחק גם הוא. לא ניתן לשחזר פעולה זו."
            className="w-full rounded-full border-2 border-red-300 bg-background px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            מחק את כל השולחנות והעמדות
          </ConfirmSubmitButton>
        </form>
            )}
          </div>
        </details>
      )}

      {(!locations || locations.length === 0) && (
        <p className="text-foreground/60">עדיין לא הוגדרו שולחנות או עמדות אוכל.</p>
      )}

      {locations && locations.length > 0 && (
        <StaffingLocationList
          items={locations.map((location) => {
            const assignedToLocation = assignments?.filter((a) => a.location_id === location.id) ?? [];
            const assignedWaiterIds = new Set(assignedToLocation.map((a) => a.waiter_id));
            const availableWaiters = waiters?.filter((w) => !assignedWaiterIds.has(w.id)) ?? [];
            const guestCount = location.location_type === "table" ? guestCountByTable.get(location.label) ?? 0 : null;

            async function removeLocation() {
              "use server";
              await deleteLocation(eventId, location.id);
            }
            async function addAssignment(formData: FormData) {
              "use server";
              await assignWaiter(
                eventId,
                location.id,
                String(formData.get("waiter_id") ?? ""),
                String(formData.get("role") ?? "waiter") as WaiterRole | WaiterSkill,
              );
            }
            async function saveLocationEdit(formData: FormData) {
              "use server";
              try {
                await updateLocation(eventId, location.id, formData);
              } catch (err) {
                return actionErrorMessage(err);
              }
            }

            const title = (
              <>
                <p className="font-medium">
                  {location.location_type === "table" ? (
                    `שולחן ${location.label}`
                  ) : (
                    <>
                      {location.label}{" "}
                      <span className="text-xs font-normal text-foreground/60">
                        ({LOCATION_TYPE_LABELS[location.location_type]})
                      </span>
                    </>
                  )}
                </p>
                {location.location_type === "table" && (
                  <p className="text-xs text-foreground/60">
                    קיבולת: {location.capacity}
                    {guestCount !== null ? ` · אורחים משובצים: ${guestCount}` : ""}
                  </p>
                )}
              </>
            );

            const chips =
              assignedToLocation.length === 0 ? (
                <span className="text-xs text-foreground/50">לא משובץ</span>
              ) : (
                assignedToLocation.map((assignment) => {
                  async function remove() {
                    "use server";
                    await unassignWaiter(eventId, assignment.id);
                  }
                  const label = `${assignment.waiters?.name ?? ""}${
                    assignment.role !== "waiter" ? ` (${ASSIGNMENT_ROLE_LABELS[assignment.role] ?? assignment.role})` : ""
                  }`;
                  return canWriteStaffing ? (
                    <form key={assignment.id} action={remove}>
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm hover:opacity-80"
                        title="הסר שיבוץ"
                      >
                        {label} ✕
                      </button>
                    </form>
                  ) : (
                    <span key={assignment.id} className="rounded-full bg-accent-soft px-3 py-1 text-sm">
                      {label}
                    </span>
                  );
                })
              );

            const assignPanel =
              canWriteStaffing && availableWaiters.length > 0 ? (
                <AssignWaiterForm waiters={availableWaiters} skillsByWaiter={skillsByWaiter} action={addAssignment} />
              ) : null;

            const editPanel = canWriteStaffing ? (
              <div className="flex flex-col gap-3">
                <SaveDetailsForm action={saveLocationEdit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-sm">
                    <span>סוג</span>
                    <select
                      name="location_type"
                      defaultValue={location.location_type}
                      className="rounded-md border border-border-classic bg-surface px-3 py-2"
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
                      className="rounded-md border border-border-classic bg-surface px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>קיבולת</span>
                    <input
                      type="number"
                      name="capacity"
                      min={0}
                      defaultValue={location.capacity}
                      className="w-24 rounded-md border border-border-classic bg-surface px-3 py-2"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-border-classic bg-surface px-4 py-2 text-sm hover:bg-accent-soft"
                  >
                    שמור
                  </button>
                </SaveDetailsForm>
                <form action={removeLocation}>
                  <ConfirmSubmitButton
                    message={`למחוק את ${location.location_type === "table" ? `שולחן ${location.label}` : location.label}? שיבוצי המלצרים אליו יימחקו גם הם.`}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    מחק
                  </ConfirmSubmitButton>
                </form>
              </div>
            ) : null;

            return {
              id: location.id,
              assigned: assignedToLocation.length > 0,
              node: <StaffingRow title={title} chips={chips} assignPanel={assignPanel} editPanel={editPanel} />,
            };
          })}
        />
      )}
    </div>
  );
}
