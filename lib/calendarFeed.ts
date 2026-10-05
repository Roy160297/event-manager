export interface FeedEvent {
  id: string;
  name: string;
  typeLabel: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM or HH:MM:SS
  canceled: boolean;
  managerName: string | null;
  salesPersonName: string | null;
  estimatedGuests: string | null;
  url: string;
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

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

const localDateTime = (date: string, minutes: number) =>
  `${compactDate(date)}T${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;

// Calendar entries use the event's start time (19:30 when none is set) and
// always end at 23:55 - the venue's events are all entered as ending that
// evening, and a later end would spill the entry onto the next date.
export const DEFAULT_START_MINUTES = 19 * 60 + 30;
export const FIXED_END_MINUTES = 23 * 60 + 55;

function eventTimes(event: FeedEvent): string[] {
  const start = event.startTime ? minutesOf(event.startTime) : DEFAULT_START_MINUTES;
  // A start at/after the fixed end (a very late event) would give an end
  // before the start; keep a minimal one-hour entry within the day instead.
  const end = start < FIXED_END_MINUTES ? FIXED_END_MINUTES : Math.min(start + 60, 24 * 60 - 1);
  return [
    `DTSTART;TZID=Asia/Jerusalem:${localDateTime(event.date, start)}`,
    `DTEND;TZID=Asia/Jerusalem:${localDateTime(event.date, end)}`,
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
