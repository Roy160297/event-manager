// Friday weddings end much earlier than the usual late-night finish (Shabbat
// constraints) - this venue's rule of thumb is a flat 6.5 hours after the
// guest-reception start time (e.g. 12:00-18:30), regardless of season. Used
// as a fallback when an import source doesn't give an explicit end time.
export function isFriday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}

export function addHoursToTime(time: string, hours: number): string | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + hours * 60;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const outHours = Math.floor(normalized / 60);
  const outMinutes = Math.round(normalized % 60);
  return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}

// Friday-specific default: 6.5 hours after the guest-reception start time.
export function fridayEndTime(startTime: string): string | null {
  return addHoursToTime(startTime, 6.5);
}
