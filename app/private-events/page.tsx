import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deletePrivateEvent } from "./actions";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate } from "@/lib/labels";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import type { PrivateEventRow } from "@/lib/types";

export default async function PrivateEventsDashboard() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("private_events")
    .select("*")
    .order("event_date", { ascending: true })
    .returns<PrivateEventRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold">האירועים הפרטיים שלי</h1>
        <Link
          href="/private-events/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          + אירוע חדש
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת האירועים: {error.message}</p>
      )}

      {!error && (!events || events.length === 0) && (
        <p className="text-foreground/80">אין עדיין אירועים פרטיים. לחצו על &quot;אירוע חדש&quot; כדי להתחיל.</p>
      )}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => {
          async function remove() {
            "use server";
            await deletePrivateEvent(event.id);
          }

          return (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4 hover:border-accent"
            >
              <Link href={`/private-events/${event.id}`} className="flex flex-1 flex-col gap-1 min-w-0">
                <p className="truncate font-medium">{event.name}</p>
                <p className="text-sm text-foreground/60">
                  {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                  {event.hall_name && ` · ${event.hall_name}`}
                </p>
              </Link>
              <form action={remove} className="ms-3">
                <ConfirmSubmitButton
                  message={`למחוק את האירוע "${event.name}"? לא ניתן לשחזר פעולה זו.`}
                  title="מחק אירוע"
                  className="rounded-md p-2 text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="sr-only">מחק</span>
                </ConfirmSubmitButton>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
