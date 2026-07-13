export type EventType = "wedding" | "bar_mitzvah" | "bat_mitzvah" | "other";
export type EventStatus = "upcoming" | "in_progress" | "completed";
export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type LocationType = "table" | "food_stand";

export interface EventRow {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  venue: string | null;
  status: EventStatus;
  notes: string | null;
  created_at: string;
}

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface TaskRow {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
}

export interface TimelineItemRow {
  id: string;
  event_id: string;
  sort_order: number;
  label: string;
  approx_time: string | null;
  notes: string | null;
}

export interface GuestRow {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rsvp_status: RsvpStatus;
  party_size: number;
  dietary_notes: string | null;
  seating_table: string | null;
  imported_at: string;
}

export interface WaiterRow {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface LocationRow {
  id: string;
  event_id: string;
  location_type: LocationType;
  label: string;
  capacity: number;
}

export interface WaiterAssignmentRow {
  id: string;
  event_id: string;
  waiter_id: string;
  location_id: string;
}
