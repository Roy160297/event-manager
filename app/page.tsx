import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

export default async function EventsDashboard() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .returns<EventRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים</h1>
        <Link
          href="/events/new"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black"
        >
          + אירוע חדש
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          שגיאה בטעינת האירועים: {error.message}. ודאו שהוגדרו משתני הסביבה של Supabase.
        </p>
      )}

      {!error && (!events || events.length === 0) && (
        <p className="text-neutral-500">אין עדיין אירועים. לחצו על &quot;אירוע חדש&quot; כדי להתחיל.</p>
      )}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-neutral-500">
                  {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                  {event.venue ? ` · ${event.venue}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium dark:bg-neutral-800">
                {EVENT_STATUS_LABELS[event.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
