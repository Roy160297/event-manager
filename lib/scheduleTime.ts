// Friday weddings end much earlier than the usual late-night finish (Shabbat
// constraints) - this venue's rule of thumb is a flat 5.5 hours after the
// guest-reception start time (e.g. 12:00-18:30), regardless of season. Used
// as a fallback when an import source doesn't give an explicit end time.
export function isFriday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}

// Integer-minute arithmetic (no float division) so shifting a whole
// schedule by a round number of minutes never drifts by a fraction of a
// minute the way hours*60 division/multiplication can.
export function addMinutesToTime(time: string, minutes: number): string | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const outHours = Math.floor(normalized / 60);
  const outMinutes = normalized % 60;
  return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}

export function addHoursToTime(time: string, hours: number): string | null {
  return addMinutesToTime(time, Math.round(hours * 60));
}

export function timeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Friday-specific default: 5.5 hours after the guest-reception start time.
export function fridayEndTime(startTime: string): string | null {
  return addHoursToTime(startTime, 5.5);
}

// Converts a wall-clock date+time as understood in Israel (e.g. a schedule
// step's event_date + approx_time) into the UTC instant it actually
// corresponds to - needed because Postgres's timestamptz (used to schedule
// the one-time chiller-reminder push, see schedule_chiller_reminder in the
// 00000000000056 migration) has no idea "20:40" here means Asia/Jerusalem
// local time. Standard guess-and-correct approach (no tz database library in
// this project): treat the wall time as if it were already UTC, see what
// wall-clock time that same instant renders as in Jerusalem, and shift by
// the difference - one iteration nails it except right around a DST
// transition, so two iterations are cheap insurance.
export function israelWallTimeToUtcISOString(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const targetWall = Date.UTC(year, month - 1, day, hour, minute, 0);

  let guess = targetWall;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const guessWallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    guess += targetWall - guessWallAsUtc;
  }

  return new Date(guess).toISOString();
}

// Weddings routinely run past midnight (end_time like 03:00), so "today's
// event" for highlighting purposes shouldn't flip over at local midnight -
// mirrors scheduleSortKey's same 6am cutoff for schedule-step ordering.
// Before 6am Israel time, we're still within the previous calendar day's event.
export function todaysEventDate(now: Date = new Date()): string {
  const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const hour = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jerusalem", hour12: false }).slice(0, 2));
  if (hour >= 6) return date;

  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day));
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}
