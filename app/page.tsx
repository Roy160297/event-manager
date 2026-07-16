import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent } from "@/app/events/actions";
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_TYPE_LABELS, formatDate, getDisplayEventStatus } from "@/lib/labels";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">אירועים</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/events/import"
            className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            ייבוא מ-PDF (iPlan)
          </Link>
          <Link
            href="/events/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            + אירוע חדש
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          שגיאה בטעינת האירועים: {error.message}. ודאו שהוגדרו משתני הסביבה של Supabase.
        </p>
      )}

      {!error && (!events || events.length === 0) && (
        <p className="text-foreground/60">אין עדיין אירועים. לחצו על &quot;אירוע חדש&quot; כדי להתחיל.</p>
      )}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => {
          const displayStatus = getDisplayEventStatus(event);

          async function remove() {
            "use server";
            await deleteEvent(event.id);
          }

          return (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4 hover:border-accent"
            >
              <Link
                href={`/events/${event.id}`}
                className="flex flex-1 flex-wrap items-center justify-between gap-3 min-w-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.name}</p>
                  <p className="text-sm text-foreground/60">
                    {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${EVENT_STATUS_COLORS[displayStatus]}`}>
                  {EVENT_STATUS_LABELS[displayStatus]}
                </span>
              </Link>
              <form action={remove} className="ms-3">
                <ConfirmSubmitButton
                  message={`למחוק את האירוע "${event.name}"? הפעולה בלתי הפיכה.`}
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
