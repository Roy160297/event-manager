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
  const elapsedMinutes = (now.getTime() - lastRunAt.getTime()) / 60000;
  return { run: elapsedMinutes >= input.intervalMinutes + jitterMinutes(lastRunAt), force: false };
}
