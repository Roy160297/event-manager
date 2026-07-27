// Automated email reminders for the couple-meeting checklist items whose
// timing is computable from a date the app already tracks (event_date or
// couple_meeting_date) - see app/couple-meeting/page.tsx for the full guide
// these mirror. Each rule fires once, on the single day its anchor date
// (offset by offsetDays) matches "today".
export type ReminderAnchor = "couple_meeting_date" | "event_date";

export interface CoupleMeetingReminderRule {
  key: string;
  anchor: ReminderAnchor;
  offsetDays: number;
  subject: string;
  body: (eventName: string) => string;
}

export const COUPLE_MEETING_REMINDER_RULES: CoupleMeetingReminderRule[] = [
  {
    key: "meeting-guidelines-email",
    anchor: "couple_meeting_date",
    offsetDays: -3,
    subject: "תזכורת: שליחת דף הנחיות לזוג",
    body: (eventName) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong>: היום התאריך לשליחת דף ההנחיות לזוג במייל (3 ימים לפני הפגישה).`,
  },
  {
    key: "final-commitment-update",
    anchor: "event_date",
    offsetDays: -7,
    subject: "תזכורת: עדכון התחייבות סופית ו-iPlan",
    body: (eventName) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong>: היום התאריך לעדכון ההתחייבות הסופית בפרטי האירוע ולהעלאת טופס אירוע סופי ל-iPlan (שבוע לפני האירוע).`,
  },
];

export function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayInIsrael(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}
