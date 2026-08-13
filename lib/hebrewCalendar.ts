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
    // greg() constructs a Date using the LOCAL Date constructor to represent
    // a specific calendar day - reading it back through toISOString() (UTC)
    // silently rolls it back a day whenever the server's local offset is
    // positive (e.g. Asia/Jerusalem), misfiling the holiday onto the
    // previous grid cell. Read the calendar-day fields straight off the
    // Date instead, which is what greg() actually encodes.
    const g = event.getDate().greg();
    const dateStr = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`;
    // hebcal names day 1 of Rosh Hashana after the incoming Hebrew year
    // itself ("Rosh Hashana 5787") rather than "I" like every other
    // multi-day holiday's "II" suffix (day 2 renders correctly as
    // "ראש השנה ב׳") - the Hebrew render carries that untranslated year
    // straight through as "ראש השנה 5787". Normalize it to match.
    const isRoshHashanaDayOne = /^Rosh Hashana \d+$/.test(event.getDesc());
    const name = isRoshHashanaDayOne ? "ראש השנה א׳" : event.render("he-x-NoNikud");
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
