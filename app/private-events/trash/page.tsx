import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { permanentlyDeletePrivateEvent, restorePrivateEvent } from "@/app/private-events/actions";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate } from "@/lib/labels";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { PrivateEventRow } from "@/lib/types";

export default async function PrivateEventsTrashPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("private_events")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .returns<PrivateEventRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">פח מיחזור</h1>
        <Link
          href="/private-events"
          className="rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          חזרה לאירועים
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת פח המיחזור: {error.message}</p>
      )}

      {!error && (!events || events.length === 0) && <p className="text-foreground/80">פח המיחזור ריק.</p>}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => {
          async function restore() {
            "use server";
            await restorePrivateEvent(event.id);
          }
          async function removeForever() {
            "use server";
            await permanentlyDeletePrivateEvent(event.id);
          }

          return (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{event.name}</p>
                <p className="text-sm text-foreground/60">
                  {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)} · נמחק ב-
                  {event.deleted_at ? new Date(event.deleted_at).toLocaleDateString("he-IL") : "—"}
                </p>
              </div>
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
