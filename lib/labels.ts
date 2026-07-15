import type {
  EventDisplayStatus,
  EventRow,
  EventStatus,
  EventType,
  LocationType,
  RsvpStatus,
  TaskPriority,
  TaskStatus,
  WaiterRole,
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

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "חתונה",
  reverse_wedding: "חתונה הפוכה",
  bat_mitzvah: "בת מצווה",
  bar_mitzvah: "בר מצווה",
  business_event: "אירוע עסקי",
  other: "אחר",
};

// Statuses a user can pick manually; "completed" is derived automatically once the event date has passed.
export const EVENT_STATUS_OPTIONS: EventStatus[] = ["planning", "approved", "canceled"];

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
  completed: "bg-accent-soft text-accent",
};

export function getDisplayEventStatus(event: Pick<EventRow, "status" | "event_date">): EventDisplayStatus {
  if (event.status === "canceled") return "canceled";
  const today = new Date().toISOString().slice(0, 10);
  if (event.event_date < today) return "completed";
  return event.status;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "פתוחה",
  in_progress: "בתהליך",
  done: "הושלמה",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-neutral-200 text-neutral-700",
  in_progress: "bg-blue-100 text-blue-700",
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

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 5);
}
