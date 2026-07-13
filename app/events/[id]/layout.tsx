import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

const SUB_NAV = [
  { segment: "", label: "סקירה" },
  { segment: "tasks", label: "משימות" },
  { segment: "timeline", label: "ציר זמן" },
  { segment: "guests", label: "אורחים" },
  { segment: "staffing", label: "צוות הגשה" },
];

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .returns<EventRow[]>()
    .single();

  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/">אירועים</Link> / {event.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium dark:bg-neutral-800">
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
      </div>

      <nav className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {SUB_NAV.map((item) => (
          <Link
            key={item.segment}
            href={`/events/${id}/${item.segment}`}
            className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
