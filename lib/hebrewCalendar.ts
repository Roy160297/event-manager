import { HDate, HebrewCalendar } from "@hebcal/core";

export function getHolidaysByDate(start: Date, end: Date): Map<string, string> {
  const events = HebrewCalendar.calendar({
    start,
    end,
    il: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
    noMinorFast: false,
    noModern: true,
  });

  const map = new Map<string, string>();
  for (const event of events) {
    const dateStr = event.getDate().greg().toISOString().slice(0, 10);
    const name = event.render("he-x-NoNikud");
    const existing = map.get(dateStr);
    map.set(dateStr, existing ? `${existing} · ${name}` : name);
  }
  return map;
}

export function getHebrewDatesByDate(start: Date, end: Date): Map<string, string> {
  const map = new Map<string, string>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const hd = new HDate(cursor);
    map.set(dateStr, hd.renderGematriya(true, true));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return map;
}
