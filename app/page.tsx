import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent } from "@/app/events/actions";
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_TYPE_LABELS, formatDate, getDisplayEventStatus } from "@/lib/labels";
import { todaysEventDate } from "@/lib/scheduleTime";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { EventManagerFilter } from "@/components/EventManagerFilter";
import { TrashIcon } from "@/components/icons";
import { getCurrentStaff } from "@/lib/auth";
import { getEventManagerCandidates } from "@/lib/staff";
import { canWrite } from "@/lib/permissions";
import type { EventRow } from "@/lib/types";

export default async function EventsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string }>;
}) {
  const { manager: managerParam } = await searchParams;
  const supabase = await createClient();
  const [{ data: events, error }, managers, currentStaff] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .order("event_date", { ascending: true })
      .returns<EventRow[]>(),
    getEventManagerCandidates(),
    getCurrentStaff(),
  ]);

  if (!currentStaff) return <NoPermissionNotice />;

  const canWriteEvents = canWrite(currentStaff.permissions, "events");

  // Default (no ?manager param yet) is "my events" when the logged-in staff
  // member is themselves an event-manager candidate; ?manager=all is the
  // explicit "show everyone" choice from the dropdown, distinct from the
  // param simply being absent on first load.
  const isSelfAManager = managers?.some((manager) => manager.id === currentStaff.id) ?? false;
  const effectiveManagerId =
    managerParam === "all" ? null : (managerParam ?? (isSelfAManager ? currentStaff.id : null));

  const filteredEvents = effectiveManagerId
    ? events?.filter((event) => event.manager_id === effectiveManagerId)
    : events;
  const managerName = (id: string | null) => managers?.find((manager) => manager.id === id)?.name ?? null;
  const highlightDate = todaysEventDate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-bold">אירועים</h1>
          <EventManagerFilter managers={managers ?? []} defaultManagerId={isSelfAManager ? currentStaff.id : null} />
        </div>
        {canWriteEvents && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/events/import"
              className="rounded-full border-2 border-accent bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              צור אירוע חדש מ&quot;טופס אירוע חתונה&quot; מ-iPlan
            </Link>
            <Link
              href="/events/import-image"
              className="rounded-full border-2 border-accent bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              יצירת אירוע מצילום מסך &quot;ענן&quot; מ-iPlan
            </Link>
            <Link
              href="/events/new"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              + אירוע חדש
            </Link>
            <div className="flex gap-2">
              <Link
                href="/events/trash"
                className="rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
              >
                פח מיחזור
              </Link>
              <a
                href="https://iplan.co.il/he-IL/corp/sign_in?"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
              >
                מעבר ל-iPlan
              </a>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          שגיאה בטעינת האירועים: {error.message}. ודאו שהוגדרו משתני הסביבה של Supabase.
        </p>
      )}

      {!error && (!events || events.length === 0) && (
        <p className="text-foreground/80">אין עדיין אירועים. לחצו על &quot;אירוע חדש&quot; כדי להתחיל.</p>
      )}

      {!error && events && events.length > 0 && filteredEvents?.length === 0 && (
        <p className="text-foreground/80">אין אירועים למנהל/ת הנבחר/ת.</p>
      )}

      <ul className="flex flex-col gap-3">
        {filteredEvents?.map((event) => {
          const displayStatus = getDisplayEventStatus(event);
          const isToday = event.event_date === highlightDate;

          async function remove() {
            "use server";
            await deleteEvent(event.id);
          }

          return (
            <li
              key={event.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 hover:border-accent ${
                isToday ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border-classic bg-surface"
              }`}
            >
              <Link
                href={`/events/${event.id}`}
                className="flex flex-1 flex-wrap items-center justify-between gap-3 min-w-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {event.name}
                    {isToday && <span className="ms-2 text-xs font-medium text-accent">אירוע היום</span>}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                    {managerName(event.manager_id) && ` · ${managerName(event.manager_id)}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${EVENT_STATUS_COLORS[displayStatus]}`}>
                  {EVENT_STATUS_LABELS[displayStatus]}
                </span>
              </Link>
              {canWriteEvents && (
                <form action={remove} className="ms-3">
                  <ConfirmSubmitButton
                    message={`למחוק את האירוע "${event.name}"? ניתן לשחזר אותו מאוחר יותר מפח המיחזור.`}
                    title="מחק אירוע"
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">מחק</span>
                  </ConfirmSubmitButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
