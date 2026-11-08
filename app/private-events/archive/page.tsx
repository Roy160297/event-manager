import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate } from "@/lib/labels";
import { todaysEventDate } from "@/lib/scheduleTime";
import type { PrivateEventRow } from "@/lib/types";

// Past events (not deleted) - the same meaning of "archive" as the venue's
// /events/archive: an event moves here on its own once its date has passed.
export default async function PrivateEventsArchivePage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("private_events")
    .select("*")
    .is("deleted_at", null)
    .lt("event_date", todaysEventDate())
    .order("event_date", { ascending: false })
    .returns<PrivateEventRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">ארכיון</h1>
        <Link
          href="/private-events"
          className="rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          חזרה לאירועים
        </Link>
      </div>

      {error && <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת הארכיון: {error.message}</p>}

      {!error && (!events || events.length === 0) && <p className="text-foreground/80">הארכיון ריק.</p>}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => (
          <li key={event.id}>
            <Link
              href={`/private-events/${event.id}`}
              className="flex flex-col gap-1 rounded-lg border border-border-classic bg-surface p-4 hover:border-accent"
            >
              <p className="truncate font-medium">{event.name}</p>
              <p className="text-sm text-foreground/60">
                {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                {event.hall_name && ` · ${event.hall_name}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
