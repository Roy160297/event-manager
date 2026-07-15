export type EventType =
  | "wedding"
  | "reverse_wedding"
  | "bat_mitzvah"
  | "bar_mitzvah"
  | "business_event"
  | "other";
export type EventStatus = "planning" | "approved" | "canceled";
export type EventDisplayStatus = EventStatus | "completed";
export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type LocationType = "table" | "food_stand";
export type WaiterRole = "waiter" | "runner";

export interface EventRow {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  status: EventStatus;
  notes: string | null;
  start_time: string | null;
  manager_id: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  estimated_guests: number | null;
  bride_name: string | null;
  groom_name: string | null;
  end_time: string | null;
  sales_person_name: string | null;
  service_style: string | null;
  guests_adults: number | null;
  guests_children: number | null;
  guests_reserve: number | null;
  bride_parents_names: string | null;
  groom_parents_names: string | null;
  menu_notes: string | null;
  parking_notes: string | null;
  table_sketch_path: string | null;
  created_at: string;
}

export interface EventSupplierRow {
  id: string;
  event_id: string;
  role: string | null;
  name: string;
  phone: string | null;
  sort_order: number;
  created_at: string;
}

export interface StaffRow {
  id: string;
  name: string;
  email: string | null;
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
  role: WaiterRole;
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
