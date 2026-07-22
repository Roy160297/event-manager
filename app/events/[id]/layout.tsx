import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_TYPE_LABELS, formatDate, getDisplayEventStatus } from "@/lib/labels";
import { EventSubNav } from "@/components/EventSubNav";
import { EventSwitcher } from "@/components/EventSwitcher";
import type { EventRow } from "@/lib/types";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: allEvents }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).returns<EventRow[]>().single(),
    supabase
      .from("events")
      .select("id, name, event_date, event_type")
      .is("deleted_at", null)
      .order("event_date", { ascending: true })
      .returns<Pick<EventRow, "id" | "name" | "event_date" | "event_type">[]>(),
  ]);

  if (!event) notFound();

  const displayStatus = getDisplayEventStatus(event);

  return (
    <div className="flex flex-col gap-6">
      <EventSwitcher events={allEvents ?? []} currentEventId={id} />

      <div>
        <p className="text-sm text-foreground/60">
          <Link href="/">אירועים</Link> / {event.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">{event.name}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${EVENT_STATUS_COLORS[displayStatus]}`}>
            {EVENT_STATUS_LABELS[displayStatus]}
          </span>
        </div>
        <p className="text-sm text-foreground/60">
          {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
        </p>
      </div>

      <EventSubNav eventId={id} />

      {children}
    </div>
  );
}
