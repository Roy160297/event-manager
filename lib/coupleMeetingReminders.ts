import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate, EVENT_TYPE_LABELS } from "@/lib/labels";
import { hasDjTzachZivSupplier } from "@/lib/djSketchReminder";
import type { EventType } from "@/lib/types";

// Automated email reminders for the couple-meeting checklist items whose
// timing is computable from a date the app already tracks (event_date or
// couple_meeting_date) - see app/couple-meeting/page.tsx for the full guide
// these mirror. Each rule fires once, on the single day its anchor date
// (offset by offsetDays) matches "today".
export type ReminderAnchor = "couple_meeting_date" | "event_date";

// Structural subset of EventRow a rule's body might need - kept local
// (rather than importing reminderRunner's ReminderableEvent) to avoid a
// circular import, since reminderRunner.ts already imports from this file.
export interface ReminderBodyEvent {
  name: string;
  event_type: EventType;
  event_date: string;
  estimated_guests: string | null;
  kids_meal_count: string | null;
  glat_meal_count: string | null;
  vegetarian_meal_count: string | null;
  vegan_meal_count: string | null;
  gluten_free_meal_count: string | null;
  toddlers_under_2_count: string | null;
}

export interface CoupleMeetingReminderRule {
  key: string;
  anchor: ReminderAnchor;
  offsetDays: number;
  // "exact" (default): fires only on the single day today === anchor+offset -
  // if that day has already passed (e.g. the event was created/edited with
  // fewer days left than the offset), it's missed for good.
  // "onOrAfter": fires the first day today is on or past anchor+offset, and
  // at most once ever for that event - catches events entering the window
  // "already late" instead of silently skipping them.
  matchMode?: "exact" | "onOrAfter";
  // Optional extra gate checked only once the date already matches, e.g. "does
  // this event actually have the supplier this reminder is about" - skips the
  // query entirely for the (large) majority of events where it's irrelevant.
  condition?: (supabase: SupabaseClient, eventId: string) => Promise<boolean>;
  // Same idea as `condition`, but synchronous and computed straight from the
  // event fields already in hand (e.g. "is event_date a Friday") - no DB call.
  dateCondition?: (event: ReminderBodyEvent) => boolean;
  // Restricts this rule to a specific daily cron pass (see vercel.json - there's
  // a morning pass and an evening pass). Omitted (the default, and every rule
  // below except the Friday-eve one) means "any pass" - safe because the
  // reminder_log unique constraint already prevents a rule from sending twice
  // in one day even if both passes evaluate it. Used for rules that need to
  // land at a specific time of day rather than just on a specific date - the
  // immediate post-save check (checkRemindersForEvent) always runs as if it
  // were the morning pass, so an evening-only rule never fires immediately.
  runWindow?: "morning" | "evening";
  // Sends to this fixed address instead of the event's manager - for
  // reminders meant for a specific staff member regardless of who's managing
  // the event (e.g. the kitchen always wants the meal breakdown).
  recipientOverride?: string;
  // A plain string for most rules; a function for the (rare) rule whose
  // subject needs to name the specific couple/event, like the kitchen one.
  subject: string | ((event: ReminderBodyEvent) => string);
  body: (event: ReminderBodyEvent) => string;
}

const mealField = (value: string | null) => value || "—";

// Same UTC-anchored computation as timeline/actions.ts's isFridayDate - kept
// as a local copy rather than a shared import since that file is a "use
// server" actions module and this one isn't.
function isFridayEvent(event: ReminderBodyEvent): boolean {
  const [year, month, day] = event.event_date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}

export const COUPLE_MEETING_REMINDER_RULES: CoupleMeetingReminderRule[] = [
  {
    key: "meeting-guidelines-email",
    anchor: "couple_meeting_date",
    offsetDays: -3,
    subject: "תזכורת: שליחת דף הנחיות לזוג",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): היום התאריך לשליחת דף ההנחיות לזוג במייל (3 ימים לפני הפגישה).`,
  },
  {
    key: "meeting-day-arrival-confirmation",
    anchor: "couple_meeting_date",
    offsetDays: 0,
    subject: "תזכורת: פגישת זוג היום",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): היום פגישת הזוג - יש לוודא הגעה בזמן לפגישה מול הזוג.`,
  },
  {
    key: "post-meeting-followup-tasks",
    anchor: "couple_meeting_date",
    offsetDays: 1,
    subject: "תזכורת: משימות לאחר פגישת הזוג",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): היום יום אחרי פגישת הזוג - יש לוודא ביצוע המשימות הבאות:<ul><li>פתיחת קבוצת וואטסאפ עם הזוג.</li><li>שליחת הנקודות העיקריות מהפגישה, וכן נקודות להמשך, לקבוצה.</li><li>העלאת טופס אירוע (עד יום אחרי הפגישה).</li><li>הכנת סקיצה ראשונית ב-iPlan (לפי כמות ההתחייבות).</li></ul>`,
  },
  {
    key: "final-commitment-and-sketch-update",
    anchor: "event_date",
    offsetDays: -7,
    matchMode: "onOrAfter",
    subject: "תזכורת: התחייבות סופית, iPlan וסקיצה",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): היום התאריך (שבוע לפני האירוע) לביצוע המשימות הבאות:<ul><li>עדכון התחייבות סופית בפרטי האירוע והעלאת טופס אירוע סופי ל-iPlan.</li><li>העלאת סקיצה סופית לאתר, לאחר ההתחייבות הסופית.</li></ul>`,
  },
  {
    key: "dj-tzach-ziv-sketch-update",
    anchor: "event_date",
    offsetDays: -7,
    matchMode: "onOrAfter",
    condition: hasDjTzachZivSupplier,
    subject: "תזכורת: עדכון סקיצה - הדיג'י צח זיו",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): הדיג'י באירוע הוא צח זיו - יש לעדכן את הסקיצה בהתאם: להוציא את עמדת הדיג'י העגולה ולהכניס במה במקומה.`,
  },
  {
    key: "guest-invitation-file-upload",
    anchor: "event_date",
    offsetDays: -1,
    subject: "תזכורת: העלאת קובץ הזמנות אורחים לאתר",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}): היום התאריך להעלאת קובץ ההזמנות (אורחים) לאתר (יום לפני האירוע).`,
  },
  {
    key: "kitchen-meal-breakdown",
    anchor: "event_date",
    offsetDays: -1,
    recipientOverride: "chef@house7.co.il",
    subject: (event) =>
      `פירוט מנות לקראת האירוע של ${event.name} - ${EVENT_TYPE_LABELS[event.event_type]} - ${formatDate(event.event_date)}`,
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}), המתקיים מחר - פירוט מנות:<ul>` +
      `<li>מספר אורחים - התחייבות: ${mealField(event.estimated_guests)}</li>` +
      `<li>מנות ילדים: ${mealField(event.kids_meal_count)}</li>` +
      `<li>מנות גלאט: ${mealField(event.glat_meal_count)}</li>` +
      `<li>מנות צמחוניות: ${mealField(event.vegetarian_meal_count)}</li>` +
      `<li>מנות טבעוניות: ${mealField(event.vegan_meal_count)}</li>` +
      `<li>מנות ללא גלוטן: ${mealField(event.gluten_free_meal_count)}</li>` +
      `<li>ילדים מתחת לגיל 2: ${mealField(event.toddlers_under_2_count)}</li>` +
      `</ul>`,
  },
  {
    key: "equipment-checklist-envelopes-day-of",
    anchor: "event_date",
    offsetDays: 0,
    dateCondition: (event) => !isFridayEvent(event),
    subject: "תזכורת: צ'קליסט ציוד ומעטפות ספק/טיפ",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}), המתקיים היום: יש לוודא מול הזוג את צ'קליסט הציוד, וכן את מעטפות הספק/טיפ.`,
  },
  {
    key: "equipment-checklist-envelopes-friday-eve",
    anchor: "event_date",
    offsetDays: -1,
    runWindow: "evening",
    dateCondition: isFridayEvent,
    subject: "תזכורת: צ'קליסט ציוד ומעטפות ספק/טיפ (אירוע יום שישי מחר)",
    body: (event) =>
      `תזכורת לגבי האירוע של <strong>${event.name}</strong> (בתאריך ${formatDate(event.event_date)}), המתקיים מחר (יום שישי): יש לוודא מול הזוג את צ'קליסט הציוד, וכן את מעטפות הספק/טיפ.`,
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
