import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { buildCalendarFeed, type FeedEvent } from "@/lib/calendarFeed";
import { totalGuestCount } from "@/lib/guestCount";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventRow, StaffRow } from "@/lib/types";

type EventWithManager = EventRow & { staff: Pick<StaffRow, "name"> | null };

// One month of events as an .ics file, for the calendar page's "add to
// Google / Apple calendar" buttons. Runs as the logged-in user (the route sits
// outside the login proxy, so it checks the session and the calendar
// permission itself) - no secret link to leak.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return new Response("Bad month", { status: 400 });
  }

  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "calendar")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("*, staff!manager_id(name)")
    .is("deleted_at", null)
    .neq("status", "canceled")
    .gte("event_date", `${month}-01`)
    .lt("event_date", `${nextMonth}-01`)
    .order("event_date", { ascending: true })
    .returns<EventWithManager[]>();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const feedEvents: FeedEvent[] = (events ?? []).map((event) => ({
    id: event.id,
    name: event.name,
    typeLabel: EVENT_TYPE_LABELS[event.event_type],
    date: event.event_date,
    startTime: event.start_time,
    canceled: false,
    managerName: event.staff?.name ?? null,
    salesPersonName: event.sales_person_name,
    estimatedGuests: totalGuestCount(event.estimated_guests),
    url: `${url.origin}/events/${event.id}`,
  }));

  return new Response(buildCalendarFeed(feedEvents), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="events-${month}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
