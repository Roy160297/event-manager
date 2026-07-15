import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import { deleteGuest, updateGuest } from "./actions";
import GuestCsvImport from "./GuestCsvImport";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { RSVP_STATUS_LABELS } from "@/lib/labels";
import type { GuestRow, RsvpStatus } from "@/lib/types";

const RSVP_STATUSES = Object.keys(RSVP_STATUS_LABELS) as RsvpStatus[];

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("name")
    .returns<GuestRow[]>();

  const confirmed = guests?.filter((g) => g.rsvp_status === "confirmed").length ?? 0;
  const declined = guests?.filter((g) => g.rsvp_status === "declined").length ?? 0;
  const pending = guests?.filter((g) => g.rsvp_status === "pending").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <GuestCsvImport eventId={eventId} />

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">מאשרים הגעה</p>
          <p className="text-2xl font-bold">{confirmed}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">ממתינים</p>
          <p className="text-2xl font-bold">{pending}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">לא מגיעים</p>
          <p className="text-2xl font-bold">{declined}</p>
        </div>
      </div>

      {(!guests || guests.length === 0) && (
        <p className="text-neutral-500">עדיין לא יובאו אורחים לאירוע זה.</p>
      )}

      {guests && guests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800">שם</th>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800">טלפון</th>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800">סטטוס</th>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800">סועדים</th>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800">שולחן</th>
                <th className="border-b border-neutral-200 p-2 text-right dark:border-neutral-800" />
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => {
                async function remove() {
                  "use server";
                  await deleteGuest(eventId, guest.id);
                }
                async function saveEdit(formData: FormData) {
                  "use server";
                  await updateGuest(eventId, guest.id, formData);
                }
                const cellClass = "border-b border-neutral-100 p-2 dark:border-neutral-900";
                const fieldClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";
                return (
                  <Fragment key={guest.id}>
                    <tr>
                      <td className={cellClass}>{guest.name}</td>
                      <td className={cellClass}>{guest.phone ?? "—"}</td>
                      <td className={cellClass}>{RSVP_STATUS_LABELS[guest.rsvp_status]}</td>
                      <td className={cellClass}>{guest.party_size}</td>
                      <td className={cellClass}>{guest.seating_table ?? "—"}</td>
                      <td className={cellClass}>
                        <form action={remove}>
                          <button
                            type="submit"
                            title="מחק אורח"
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">מחק</span>
                          </button>
                        </form>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} className={`${cellClass} bg-neutral-50/50 dark:bg-neutral-900/50`}>
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-neutral-500">ערוך אורח</summary>
                          <SaveDetailsForm action={saveEdit} className="mt-2 flex flex-wrap items-end gap-2">
                            <label className="flex flex-col gap-1 text-xs">
                              <span>שם</span>
                              <input name="name" defaultValue={guest.name} required className={fieldClass} />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>טלפון</span>
                              <input name="phone" defaultValue={guest.phone ?? ""} className={fieldClass} />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>סטטוס</span>
                              <select name="rsvp_status" defaultValue={guest.rsvp_status} className={fieldClass}>
                                {RSVP_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {RSVP_STATUS_LABELS[status]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>סועדים</span>
                              <input
                                type="number"
                                name="party_size"
                                min={1}
                                defaultValue={guest.party_size}
                                className={`${fieldClass} w-20`}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>שולחן</span>
                              <input name="seating_table" defaultValue={guest.seating_table ?? ""} className={fieldClass} />
                            </label>
                            <button
                              type="submit"
                              className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                            >
                              שמור
                            </button>
                          </SaveDetailsForm>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
