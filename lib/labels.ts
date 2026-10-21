import { todaysEventDate } from "@/lib/scheduleTime";
import type {
  EventDisplayStatus,
  EventRow,
  LocationType,
  MenuType,
  RsvpStatus,
  TaskPriority,
  TaskStatus,
  WaiterRole,
  WaiterSkill,
} from "@/lib/types";

export const MONTH_LABELS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];


export const MENU_TYPE_LABELS: Record<MenuType, string> = {
  buffet: "מזנונים",
  plated: "הגשה",
};

// Status is no longer manually editable: new events start "approved" directly,
// canceling means deleting the event, and "completed" is derived automatically
// once the event date has passed. "planning"/"canceled" remain valid labels
// only so any leftover historical data still renders correctly.
export const EVENT_STATUS_LABELS: Record<EventDisplayStatus, string> = {
  planning: "תכנון",
  approved: "מאושר",
  canceled: "מבוטל",
  completed: "הושלם",
};

export const EVENT_STATUS_COLORS: Record<EventDisplayStatus, string> = {
  planning: "bg-neutral-200 text-neutral-700",
  approved: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

// Distinct, easily-told-apart colors for the calendar's manager legend -
// deliberately a different palette from EVENT_STATUS_COLORS above so the two
// kinds of coloring (this one replaces status color on the calendar grid,
// per the venue's request to see at a glance whose events are whose) don't
// get confused with one another if both ever show up in the same UI.
const MANAGER_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
  "bg-lime-100 text-lime-700",
];

// Events with no manager assigned (or whose manager has no color, e.g. someone
// who is no longer eligible to manage events) fall back to this neutral color
// rather than crashing/blending into the palette.
export const UNASSIGNED_MANAGER_COLOR = "bg-neutral-200 text-neutral-700";

// Deterministic name -> color assignment for the calendar's manager legend -
// the same input list always produces the same mapping (sorted first), so a
// given manager's color stays stable across months/reloads without needing a
// stored color column. Only people who can be assigned as an event manager are
// passed in (see getEventManagerCandidates), so only they get a color. Cycles
// back through the palette past its length rather than crashing, since the
// manager list isn't bounded in code.
export function assignManagerColors(managerNames: string[]): Map<string, string> {
  const sorted = [...new Set(managerNames)].sort((a, b) => a.localeCompare(b, "he"));
  const map = new Map<string, string>();
  sorted.forEach((name, index) => map.set(name, MANAGER_COLOR_PALETTE[index % MANAGER_COLOR_PALETTE.length]));
  return map;
}

export function getDisplayEventStatus(event: Pick<EventRow, "status" | "event_date">): EventDisplayStatus {
  if (event.status === "canceled") return "canceled";
  // An event is over only the morning after (same 6am cutoff as the dashboard), not at midnight.
  if (event.event_date < todaysEventDate()) return "completed";
  return event.status;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "פתוחה",
  done: "הושלמה",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-neutral-200 text-neutral-700",
  done: "bg-green-100 text-green-700",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-neutral-200 text-neutral-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700",
};

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  pending: "ממתין",
  confirmed: "מאשר הגעה",
  declined: "לא מגיע",
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  table: "שולחן",
  food_stand: "עמדת אוכל",
};

export const WAITER_ROLE_LABELS: Record<WaiterRole, string> = {
  waiter: "מלצר/ית",
  runner: "ראנר/פינוי",
};

// A permanent per-waiter capability matrix (shown as a checkmark grid on the
// waiters page). Also now what a waiter_assignments row's role is chosen
// from (see the 00000000000064 migration) - assigning someone to a table
// specifies which of these duties they're covering there. WaiterRole above
// is only the old waiter/runner default kept for pre-existing rows.
export const WAITER_SKILLS: WaiterSkill[] = [
  "runner",
  "clearing",
  "piloting",
  "station",
  "table",
  "hall_prep",
  "door",
  "family_waiter",
];

export const WAITER_SKILL_LABELS: Record<WaiterSkill, string> = {
  runner: "ראנר",
  clearing: "פינויים",
  piloting: "פיילות",
  station: "עמדה",
  table: "שולחן",
  hall_prep: "הכנת אולם",
  door: "מלצר דלת",
  family_waiter: "מלצרית משפחה",
};

// Covers both a fresh assignment's role (always a WaiterSkill now) and a
// legacy row's WaiterRole - skill labels win where the two overlap (runner).
export const ASSIGNMENT_ROLE_LABELS: Record<string, string> = { ...WAITER_ROLE_LABELS, ...WAITER_SKILL_LABELS };

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const HEBREW_WEEKDAY_LETTERS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

// "11/10/2026 · יום א'" - date plus the Hebrew weekday letter (Sunday = א').
export function formatDateWithWeekday(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return formatDate(value);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${formatDate(value)} · יום ${HEBREW_WEEKDAY_LETTERS[weekday]}`;
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

// Wedding schedules run past midnight, so a plain time comparison would sort
// "00:30" before "19:30". Times before 6am are treated as a continuation of
// the previous night and pushed to the end of the day for sorting purposes.
export function scheduleSortKey(time: string | null): number {
  if (!time) return Infinity;
  const [h, m] = time.split(":").map(Number);
  const minutes = h * 60 + m;
  return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
}
