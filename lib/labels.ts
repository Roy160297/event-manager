import type {
  EventStatus,
  EventType,
  LocationType,
  RsvpStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "חתונה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  other: "אחר",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "קרוב",
  in_progress: "מתקיים",
  completed: "הסתיים",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "פתוחה",
  in_progress: "בתהליך",
  done: "הושלמה",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
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

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
