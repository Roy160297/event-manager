// When the extension should actually go to iPlan. The extension wakes up
// every few minutes and only asks the site "is it time?" - the answer comes
// from here, so the pace can be changed without touching the extension.
export interface ScheduleInput {
  now: Date;
  // Last time the extension reported a run of any kind (ok / login / error).
  lastRunAt: Date | null;
  intervalMinutes: number;
  activeFromHour: number; // Israel time, inclusive
  activeToHour: number; // Israel time, exclusive
  runRequestedAt: Date | null;
}

// An interval of a day or more means "once a day, in the morning".
export const DAILY_MINUTES = 1440;

export function israelDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date);
}

export function israelHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(date)) % 24;
}

// A few minutes of extra wait, stable for a given last run (so repeated polls
// agree) but different from run to run, so the visits to iPlan don't land on
// a machine-regular clock.
export function jitterMinutes(lastRunAt: Date): number {
  return Math.floor(lastRunAt.getTime() / 60000) % 21;
}

export function shouldRunSync(input: ScheduleInput): { run: boolean; force: boolean } {
  const { now, lastRunAt, runRequestedAt } = input;

  // "Sync now" from the admin page: run at the next poll, outside quiet hours too.
  if (runRequestedAt && (!lastRunAt || runRequestedAt > lastRunAt)) return { run: true, force: true };

  const hour = israelHour(now);
  if (hour < input.activeFromHour || hour >= input.activeToHour) return { run: false, force: false };

  if (!lastRunAt) return { run: true, force: false };

  if (input.intervalMinutes >= DAILY_MINUTES) {
    // Once per Israeli calendar day, starting a few (varying) minutes after the
    // morning window opens - so the visit does not fall on the same minute daily.
    if (israelDate(lastRunAt) >= israelDate(now)) return { run: false, force: false };
    const minutesIntoDay = hour * 60 + Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", minute: "2-digit" }).format(now));
    return { run: minutesIntoDay >= input.activeFromHour * 60 + jitterMinutes(lastRunAt), force: false };
  }
  const elapsedMinutes = (now.getTime() - lastRunAt.getTime()) / 60000;
  return { run: elapsedMinutes >= input.intervalMinutes + jitterMinutes(lastRunAt), force: false };
}
