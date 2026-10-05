// Date helpers shared by the email-reminder engine (lib/emailReminders.ts,
// lib/reminderRunner.ts) and several pages. The reminder rules themselves
// live in the email_reminder_rules table and are managed from the
// push-reminders page.
export function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayInIsrael(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}
