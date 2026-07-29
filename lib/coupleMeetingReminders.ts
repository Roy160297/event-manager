import { formatDate } from "@/lib/labels";

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
  body: (eventName: string, eventDate: string) => string;
}

export const COUPLE_MEETING_REMINDER_RULES: CoupleMeetingReminderRule[] = [
  {
    key: "meeting-guidelines-email",
    anchor: "couple_meeting_date",
    offsetDays: -3,
    subject: "תזכורת: שליחת דף הנחיות לזוג",
    body: (eventName, eventDate) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong> (בתאריך ${formatDate(eventDate)}): היום התאריך לשליחת דף ההנחיות לזוג במייל (3 ימים לפני הפגישה).`,
  },
  {
    key: "meeting-day-arrival-confirmation",
    anchor: "couple_meeting_date",
    offsetDays: 0,
    subject: "תזכורת: פגישת זוג היום",
    body: (eventName, eventDate) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong> (בתאריך ${formatDate(eventDate)}): היום פגישת הזוג - יש לוודא הגעה בזמן לפגישה מול הזוג.`,
  },
  {
    key: "post-meeting-followup-tasks",
    anchor: "couple_meeting_date",
    offsetDays: 1,
    subject: "תזכורת: משימות לאחר פגישת הזוג",
    body: (eventName, eventDate) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong> (בתאריך ${formatDate(eventDate)}): היום יום אחרי פגישת הזוג - יש לוודא ביצוע המשימות הבאות:<ul><li>פתיחת קבוצת וואטסאפ עם הזוג.</li><li>שליחת הנקודות העיקריות מהפגישה, וכן נקודות להמשך, לקבוצה.</li><li>העלאת טופס אירוע (עד יום אחרי הפגישה).</li><li>הכנת סקיצה ראשונית ב-iPlan (לפי כמות ההתחייבות).</li></ul>`,
  },
  {
    key: "final-commitment-and-sketch-update",
    anchor: "event_date",
    offsetDays: -7,
    subject: "תזכורת: התחייבות סופית, iPlan וסקיצה",
    body: (eventName, eventDate) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong> (בתאריך ${formatDate(eventDate)}): היום התאריך (שבוע לפני האירוע) לביצוע המשימות הבאות:<ul><li>עדכון התחייבות סופית בפרטי האירוע והעלאת טופס אירוע סופי ל-iPlan.</li><li>העלאת סקיצה סופית לאתר, לאחר ההתחייבות הסופית.</li></ul>`,
  },
  {
    key: "guest-invitation-file-upload",
    anchor: "event_date",
    offsetDays: -1,
    subject: "תזכורת: העלאת קובץ הזמנות אורחים לאתר",
    body: (eventName, eventDate) =>
      `תזכורת לגבי האירוע של <strong>${eventName}</strong> (בתאריך ${formatDate(eventDate)}): היום התאריך להעלאת קובץ ההזמנות (אורחים) לאתר (יום לפני האירוע).`,
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
