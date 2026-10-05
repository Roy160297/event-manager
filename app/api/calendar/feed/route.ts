import { createAdminClient } from "@/lib/supabase/admin";
import { buildCalendarFeed, isValidCalendarFeedToken, type FeedEvent } from "@/lib/calendarFeed";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { addDaysToDate, todayInIsrael } from "@/lib/coupleMeetingReminders";
import type { EventRow, StaffRow } from "@/lib/types";

type EventWithManager = EventRow & { staff: Pick<StaffRow, "name"> | null };

// Subscribed to by Google/Apple Calendar (see the calendar page). Like the
// cron routes it sits outside the login proxy (the matcher excludes /api) and
// authenticates with a secret in the URL instead, since calendar apps can't
// carry a session.
export async function GET(request: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = new URL(request.url);
  if (!secret || !isValidCalendarFeedToken(url.searchParams.get("token"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*, staff!manager_id(name)")
      .is("deleted_at", null)
      .gte("event_date", addDaysToDate(todayInIsrael(), -60))
      .order("event_date", { ascending: true })
      .returns<EventWithManager[]>();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const feedEvents: FeedEvent[] = (events ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      typeLabel: EVENT_TYPE_LABELS[event.event_type],
      date: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      canceled: event.status === "canceled",
      managerName: event.staff?.name ?? null,
      salesPersonName: event.sales_person_name,
      estimatedGuests: event.estimated_guests,
      url: `${url.origin}/events/${event.id}`,
    }));

    return new Response(buildCalendarFeed(feedEvents), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "שגיאה לא צפויה" }, { status: 500 });
  }
}
