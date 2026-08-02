import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_TYPE_LABELS, formatDate, getDisplayEventStatus } from "@/lib/labels";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import type { EventRow } from "@/lib/types";

export default async function EventsArchivePage() {
  const supabase = await createClient();
  const [{ data: events, error }, currentStaff] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .lt("event_date", todayInIsrael())
      .order("event_date", { ascending: false })
      .returns<EventRow[]>(),
    getCurrentStaff(),
  ]);

  const canReadEvents = !!currentStaff && canRead(currentStaff.permissions, "events");

  if (!canReadEvents) return <NoPermissionNotice />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl font-bold">ארכיון</h1>
        <Link
          href="/"
          className="rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          חזרה לאירועים
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת הארכיון: {error.message}</p>
      )}

      {!error && (!events || events.length === 0) && <p className="text-foreground/80">הארכיון ריק.</p>}

      <ul className="flex flex-col gap-3">
        {events?.map((event) => {
          const displayStatus = getDisplayEventStatus(event);
          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4 hover:border-accent"
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
