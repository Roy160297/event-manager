"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

type SwitcherEvent = Pick<EventRow, "id" | "name" | "event_date" | "event_type">;

export function EventSwitcher({
  events,
  currentEventId,
}: {
  events: SwitcherEvent[];
  currentEventId: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const base = `/events/${currentEventId}`;
  const subPath = pathname.startsWith(base) ? pathname.slice(base.length) : "";

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? events.filter((event) =>
        `${event.name} ${formatDate(event.event_date)} ${event.event_date}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : events;

  return (
    <aside className="fixed right-0 top-24 bottom-16 z-10 hidden w-56 flex-col border-l border-border-classic bg-surface 2xl:flex">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם או תאריך..."
          className="rounded-md border border-border-classic bg-background px-2 py-1.5 text-sm"
        />
        <ul className="flex flex-col gap-1">
          {filtered.map((event) => {
            const isCurrent = event.id === currentEventId;
            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}${subPath}`}
                  className={
                    isCurrent
                      ? "block rounded-md bg-accent-soft px-2 py-1.5 text-sm font-semibold text-accent"
                      : "block rounded-md px-2 py-1.5 text-sm hover:bg-accent-soft"
                  }
                >
                  <p className="truncate">{event.name}</p>
                  <p className="truncate text-xs text-foreground/60">
                    {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                  </p>
                </Link>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-foreground/60">לא נמצאו אירועים</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
