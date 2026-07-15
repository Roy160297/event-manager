import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDisplayEventStatus, MONTH_LABELS } from "@/lib/labels";
import { getHebrewDatesByDate, getHolidaysByDate } from "@/lib/hebrewCalendar";
import { CalendarGrid, type CalendarCell, type CalendarEvent } from "@/components/CalendarGrid";
import { MonthPicker } from "@/components/MonthPicker";
import type { EventRow, StaffRow } from "@/lib/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseMonthParam(raw: string | undefined) {
  const now = new Date();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function buildCells(
  year: number,
  month: number,
  eventsByDate: Map<string, CalendarEvent[]>,
  holidaysByDate: Map<string, string>,
  hebrewDatesByDate: Map<string, string>,
) {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (CalendarCell | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    cells.push({
      day,
      dateStr,
      events: eventsByDate.get(dateStr) ?? [],
      holiday: holidaysByDate.get(dateStr) ?? null,
      hebrewDate: hebrewDatesByDate.get(dateStr) ?? null,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type EventWithManager = EventRow & { staff: Pick<StaffRow, "name"> | null };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonthParam(monthParam);

  const monthStart = `${year}-${pad(month)}-01`;
  const { year: nextYear, month: nextMonth } = shiftMonth(year, month, 1);
  const nextMonthStart = `${nextYear}-${pad(nextMonth)}-01`;

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*, staff(name)")
    .gte("event_date", monthStart)
    .lt("event_date", nextMonthStart)
    .order("event_date", { ascending: true })
    .returns<EventWithManager[]>();

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events ?? []) {
    const calendarEvent: CalendarEvent = {
      id: event.id,
      name: event.name,
      eventType: event.event_type,
      startTime: event.start_time,
      displayStatus: getDisplayEventStatus(event),
      managerName: event.staff?.name ?? null,
      salesPersonName: event.sales_person_name,
      estimatedGuests: event.estimated_guests,
    };
    const list = eventsByDate.get(event.event_date) ?? [];
    list.push(calendarEvent);
    eventsByDate.set(event.event_date, list);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthRangeStart = new Date(Date.UTC(year, month - 1, 1));
  const monthRangeEnd = new Date(Date.UTC(year, month - 1, daysInMonth));
  const holidaysByDate = getHolidaysByDate(monthRangeStart, monthRangeEnd);
  const hebrewDatesByDate = getHebrewDatesByDate(monthRangeStart, monthRangeEnd);

  const cells = buildCells(year, month, eventsByDate, holidaysByDate, hebrewDatesByDate);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <MonthPicker year={year} month={month} />

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/calendar?month=${prev.year}-${pad(prev.month)}`}
            className="rounded-full border border-border-classic px-3 py-1 text-sm hover:bg-accent-soft"
          >
            ‹ {MONTH_LABELS[prev.month - 1]}
          </Link>
          <h1 className="font-serif text-2xl font-bold">
            {MONTH_LABELS[month - 1]} {year}
          </h1>
          <Link
            href={`/calendar?month=${next.year}-${pad(next.month)}`}
            className="rounded-full border border-border-classic px-3 py-1 text-sm hover:bg-accent-soft"
          >
            {MONTH_LABELS[next.month - 1]} ›
          </Link>
        </div>

        <CalendarGrid cells={cells} todayStr={todayStr} />
      </div>
    </div>
  );
}
