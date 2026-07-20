import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { permanentlyDeleteEvent, restoreEvent } from "@/app/events/actions";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import type { EventRow } from "@/lib/types";

export default async function EventsTrashPage() {
  const supabase = await createClient();
  const [{ data: events, error }, currentStaff] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .returns<EventRow[]>(),
    getCurrentStaff(),
  ]);

  const canReadEvents = !!currentStaff && canRead(currentStaff.permissions, "events");
  const canWriteEvents = !!currentStaff && canWrite(currentStaff.permissions, "events");

  if (!canReadEvents) return <NoPermissionNotice />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">פח מיחזור</h1>
        <Link
          href="/"
          className="rounded-full border border-border-classic px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          חזרה לאירועים
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת פח המיחזור: {error.message}</p>
      )}

      {!error && (!events || events.length === 0) && (
        <p className="text-foreground/60">פח המיחזור ריק.</p>
      )}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => {
          async function restore() {
            "use server";
            await restoreEvent(event.id);
          }
          async function removeForever() {
            "use server";
            await permanentlyDeleteEvent(event.id);
          }

          return (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{event.name}</p>
                <p className="text-sm text-foreground/60">
                  {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)} · נמחק ב-
                  {event.deleted_at ? new Date(event.deleted_at).toLocaleDateString("he-IL") : "—"}
                </p>
              </div>
              {canWriteEvents && (
                <div className="flex gap-2">
                  <form action={restore}>
                    <button
                      type="submit"
                      className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft"
                    >
                      שחזר
                    </button>
                  </form>
                  <form action={removeForever}>
                    <ConfirmSubmitButton
                      message={`למחוק את האירוע "${event.name}" לצמיתות? לא ניתן לשחזר פעולה זו.`}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      מחק לצמיתות
                    </ConfirmSubmitButton>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
