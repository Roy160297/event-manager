import { createLocation, deleteLocation, updateLocation } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { actionErrorMessage } from "@/lib/actionError";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import TableSketchPhoto from "./TableSketchPhoto";
import type { LocationType, PrivateEventGuestRow, PrivateEventLocationRow, PrivateEventRow } from "@/lib/types";

const LOCATION_TYPES = Object.keys(LOCATION_TYPE_LABELS) as LocationType[];

export default async function PrivateStaffingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: locationsRaw }, { data: guests }, { data: event }] = await Promise.all([
    supabase
      .from("private_event_locations")
      .select("*")
      .eq("event_id", eventId)
      .order("location_type")
      .order("label")
      .returns<PrivateEventLocationRow[]>(),
    supabase
      .from("private_event_guests")
      .select("seating_table, party_size")
      .eq("event_id", eventId)
      .returns<Pick<PrivateEventGuestRow, "seating_table" | "party_size">[]>(),
    supabase
      .from("private_events")
      .select("table_sketch_path, sketch_seated_chairs_count")
      .eq("id", eventId)
      .single()
      .returns<Pick<PrivateEventRow, "table_sketch_path" | "sketch_seated_chairs_count">>(),
  ]);

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
    ? ((await supabase.storage.from("private-event-sketches").createSignedUrl(sketchPath, 60 * 60)).data?.signedUrl ?? null)
    : null;
  const isSketchPdf = sketchPath?.toLowerCase().endsWith(".pdf") ?? false;

  const guestCountByTable = new Map<string, number>();
  for (const guest of guests ?? []) {
    if (!guest.seating_table) continue;
    guestCountByTable.set(guest.seating_table, (guestCountByTable.get(guest.seating_table) ?? 0) + (guest.party_size || 1));
  }

  async function addLocation(formData: FormData) {
    "use server";
    await createLocation(eventId, formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <TableSketchPhoto eventId={eventId} sketchUrl={sketchUrl} isPdf={isSketchPdf} seatedChairsCount={event?.sketch_seated_chairs_count ?? null} />

      <form action={addLocation} className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span>סוג</span>
          <select name="location_type" defaultValue="table" className="rounded-md border border-border-classic bg-surface px-3 py-2">
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOCATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span>שם</span>
          <input name="label" required placeholder='לדוגמה: שולחן 5, "עמדת סושי"' className="rounded-md border border-border-classic bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>קיבולת</span>
          <input type="number" name="capacity" min={0} defaultValue={0} className="w-24 rounded-md border border-border-classic bg-surface px-3 py-2" />
        </label>
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
          הוסף
        </button>
      </form>

      {(!locations || locations.length === 0) && <p className="text-foreground/60">עדיין לא הוגדרו שולחנות או עמדות אוכל.</p>}

      <ul className="flex flex-col gap-3">
        {locations?.map((location) => {
          const guestCount = location.location_type === "table" ? guestCountByTable.get(location.label) ?? 0 : null;

          async function removeLocation() {
            "use server";
            await deleteLocation(eventId, location.id);
          }
          async function saveLocationEdit(formData: FormData) {
            "use server";
            try {
              await updateLocation(eventId, location.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }

          return (
            <li key={location.id} className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {location.location_type === "table" ? (
                      `שולחן ${location.label}`
                    ) : (
                      <>
                        {location.label} <span className="text-sm font-normal text-foreground/60">({LOCATION_TYPE_LABELS[location.location_type]})</span>
                      </>
                    )}
                  </p>
                  {location.location_type === "table" && (
                    <p className="text-sm text-foreground/60">
                      קיבולת: {location.capacity}
                      {guestCount !== null ? ` · אורחים משובצים: ${guestCount}` : ""}
                    </p>
                  )}
                </div>
                <form action={removeLocation}>
                  <button type="submit" title="מחק" className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">מחק</span>
                  </button>
                </form>
              </div>

              <details>
                <summary className="cursor-pointer text-xs font-medium text-foreground/60">ערוך פרטים</summary>
                <SaveDetailsForm action={saveLocationEdit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-sm">
                    <span>סוג</span>
                    <select name="location_type" defaultValue={location.location_type} className="rounded-md border border-border-classic bg-surface px-3 py-2">
                      {LOCATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {LOCATION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span>שם</span>
                    <input name="label" defaultValue={location.label} required className="rounded-md border border-border-classic bg-surface px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>קיבולת</span>
                    <input type="number" name="capacity" min={0} defaultValue={location.capacity} className="w-24 rounded-md border border-border-classic bg-surface px-3 py-2" />
                  </label>
                  <button type="submit" className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft">
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
