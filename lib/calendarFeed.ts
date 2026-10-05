import { createHmac, timingSafeEqual } from "node:crypto";

export interface FeedEvent {
  id: string;
  name: string;
  typeLabel: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM or HH:MM:SS
  endTime: string | null;
  canceled: boolean;
  managerName: string | null;
  salesPersonName: string | null;
  estimatedGuests: string | null;
  url: string;
}

// The feed is read by Google/Apple Calendar, which can't send a login
// session, so access is a secret in the URL instead. It's derived from the
// service-role key (HMAC) rather than stored separately: stable across
// deploys, nothing new to configure, and rotating the key rotates the feed.
export function calendarFeedToken(secret: string): string {
  return createHmac("sha256", secret).update("calendar-feed-v1").digest("hex").slice(0, 32);
}

export function isValidCalendarFeedToken(provided: string | null, secret: string): boolean {
  if (!provided) return false;
  const expected = Buffer.from(calendarFeedToken(secret));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545 caps lines at 75 octets and continues them with a leading space;
// Hebrew is 2 bytes per character, so fold on byte length without ever
// splitting a multi-byte character.
function foldLine(line: string): string {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (date: string) => date.replaceAll("-", "");

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

const localDateTime = (date: string, minutes: number) =>
  `${compactDate(date)}T${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;

// Events with no start time become all-day entries. An end at or before the
// start means the event runs past midnight (a wedding ending at 01:00), and
// a missing end defaults to 5 hours after the start.
function eventTimes(event: FeedEvent): string[] {
  if (!event.startTime) {
    return [`DTSTART;VALUE=DATE:${compactDate(event.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`];
  }
  const start = minutesOf(event.startTime);
  let endDate = event.date;
  let end = event.endTime ? minutesOf(event.endTime) : start + 5 * 60;
  if (end <= start && event.endTime) end += 24 * 60;
  if (end >= 24 * 60) {
    endDate = nextDay(event.date);
    end -= 24 * 60;
  }
  return [
    `DTSTART;TZID=Asia/Jerusalem:${localDateTime(event.date, start)}`,
    `DTEND;TZID=Asia/Jerusalem:${localDateTime(endDate, end)}`,
  ];
}

export function buildCalendarFeed(events: FeedEvent[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//House No. Seven//Event Manager//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:אירועי שבע",
    "X-WR-TIMEZONE:Asia/Jerusalem",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    const details = [
      event.managerName ? `מנהל אירוע: ${event.managerName}` : null,
      event.salesPersonName ? `איש מכירות: ${event.salesPersonName}` : null,
      event.estimatedGuests?.trim() ? `אורחים: ${event.estimatedGuests.trim()}` : null,
      event.url,
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@my-event-manager`,
      `DTSTAMP:${stamp}`,
      ...eventTimes(event),
      `SUMMARY:${escapeText(`${event.name} (${event.typeLabel})`)}`,
      `DESCRIPTION:${escapeText(details.join("\n"))}`,
      `URL:${event.url}`,
      `STATUS:${event.canceled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
