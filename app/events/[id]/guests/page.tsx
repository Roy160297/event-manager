import { createClient } from "@/lib/supabase/server";
import { deleteGuest } from "./actions";
import GuestCsvImport from "./GuestCsvImport";
import { RSVP_STATUS_LABELS } from "@/lib/labels";
import type { GuestRow } from "@/lib/types";

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
                return (
                  <tr key={guest.id}>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">{guest.name}</td>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">{guest.phone ?? "—"}</td>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">
                      {RSVP_STATUS_LABELS[guest.rsvp_status]}
                    </td>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">{guest.party_size}</td>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">
                      {guest.seating_table ?? "—"}
                    </td>
                    <td className="border-b border-neutral-100 p-2 dark:border-neutral-900">
                      <form action={remove}>
                        <button type="submit" className="text-red-600 hover:underline">
                          מחק
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
