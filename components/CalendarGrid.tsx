"use client";

import Link from "next/link";
import { useState } from "react";
import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  formatTime,
} from "@/lib/labels";
import type { EventDisplayStatus, EventType } from "@/lib/types";

export interface CalendarEvent {
  id: string;
  name: string;
  eventType: EventType;
  startTime: string | null;
  displayStatus: EventDisplayStatus;
  managerName: string | null;
  salesPersonName: string | null;
  estimatedGuests: number | null;
}

export interface CalendarCell {
  day: number;
  dateStr: string;
  events: CalendarEvent[];
  holiday: string | null;
  hebrewDate: string | null;
}

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export function CalendarGrid({
  cells,
  todayStr,
}: {
  cells: (CalendarCell | null)[];
  todayStr: string;
}) {
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground/60">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} />;
          const isToday = cell.dateStr === todayStr;
          return (
            <div
              key={cell.dateStr}
              className={`flex min-h-24 flex-col gap-1 rounded-lg border p-1.5 text-xs ${
                isToday ? "border-accent bg-accent-soft/40" : "border-border-classic bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-foreground/60">{cell.day}</span>
                  {cell.hebrewDate && (
                    <span className="text-[9px] text-foreground/40">{cell.hebrewDate}</span>
                  )}
                </div>
                {cell.holiday && (
                  <span
                    className="truncate text-[9px] font-medium text-accent"
                    title={cell.holiday}
                  >
                    {cell.holiday}
                  </span>
                )}
              </div>
              {cell.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelected(event)}
                  className={`flex flex-col items-start rounded-md px-1.5 py-1 text-start leading-tight ${EVENT_STATUS_COLORS[event.displayStatus]}`}
                  title={event.name}
                >
                  <span className="w-full truncate text-[11px] font-semibold">{event.name}</span>
                  <span className="w-full truncate text-[10px] opacity-80">
                    {EVENT_TYPE_LABELS[event.eventType]}
                    {event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-lg border border-border-classic bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg font-bold">{selected.name}</p>
              <p className="text-sm text-foreground/60">
                {EVENT_TYPE_LABELS[selected.eventType]}
                {selected.startTime ? ` · ${formatTime(selected.startTime)}` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${EVENT_STATUS_COLORS[selected.displayStatus]}`}
            >
              {EVENT_STATUS_LABELS[selected.displayStatus]}
            </span>
          </div>
          <dl className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            <div className="flex gap-1">
              <dt className="text-foreground/60">מנהל/ת אחראי/ת:</dt>
              <dd>{selected.managerName ?? "—"}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-foreground/60">איש/ת מכירות:</dt>
              <dd>{selected.salesPersonName ?? "—"}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-foreground/60">אורחים - התחייבות:</dt>
              <dd>{selected.estimatedGuests ?? "—"}</dd>
            </div>
          </dl>
          <Link
            href={`/events/${selected.id}`}
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            למעבר לעמוד האירוע המלא ›
          </Link>
        </div>
      )}
    </div>
  );
}
