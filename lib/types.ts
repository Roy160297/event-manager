export type EventType =
  | "wedding"
  | "wedding_service"
  | "reverse_wedding"
  | "reverse_wedding_service"
  | "bat_mitzvah"
  | "bar_mitzvah"
  | "business_event"
  | "other";
export type EventStatus = "planning" | "approved" | "canceled";
export type EventDisplayStatus = EventStatus | "completed";
export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type LocationType = "table" | "food_stand";
export type WaiterRole = "waiter" | "runner";
export type PermissionResource =
  | "events"
  | "guests"
  | "tasks"
  | "closing_checklist"
  | "event_summary_report"
  | "timeline"
  | "staffing"
  | "waiters"
  | "admin"
  | "floor_manager_checklist"
  | "bar_checklist"
  | "barista_checklist"
  | "couple_meeting"
  | "event_management_dex"
  | "my_tasks"
  | "menu"
  | "calendar";

export type MenuType = "buffet" | "plated";

export interface MenuSection {
  label: string;
  note: string | null;
  items: string[];
}

export interface EventRow {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  couple_meeting_date: string | null;
  status: EventStatus;
  notes: string | null;
  deleted_at: string | null;
  start_time: string | null;
  manager_id: string | null;
  floor_manager_id: string | null;
  sales_person_id: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  estimated_guests: string | null;
  kids_meal_count: string | null;
  glat_meal_count: string | null;
  vegetarian_meal_count: string | null;
  vegan_meal_count: string | null;
  gluten_free_meal_count: string | null;
  toddlers_under_2_count: string | null;
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
  production_company: string | null;
  exit_time: string | null;
  report_end_time: string | null;
  final_guest_count_counter: string | null;
  final_guest_count_iplan: string | null;
  reserve_opened_count: string | null;
  bar_manager_name: string | null;
  bartender_count: string | null;
  floor_manager_name: string | null;
  waiter_count: string | null;
  cook_count: string | null;
  kitchen_dishwasher_count: string | null;
  dishwasher_count: string | null;
  security_guard_count: string | null;
  security_guard_hours: string | null;
  report_summary: string | null;
  report_general_notes: string | null;
  hall_cleaner_hours: string | null;
  restroom_cleaner_hours: string | null;
  kitchen_dishwasher_hours: string | null;
  dishwasher_hours: string | null;
  sketch_seated_chairs_count: string | null;
  created_at: string;
}

export interface EventMenuRow {
  event_id: string;
  menu_type: MenuType;
  title: string | null;
  subtitle: string | null;
  linens_note: string | null;
  sections: MenuSection[];
  footer_notes: string[];
  updated_at: string;
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
  user_id: string | null;
  role_id: string | null;
  created_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  can_be_event_manager: boolean;
  created_at: string;
}

export interface RolePermissionRow {
  role_id: string;
  resource: PermissionResource;
  can_read: boolean;
  can_write: boolean;
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

export interface ChecklistPhotoRow {
  id: string;
  event_id: string;
  checklist_key: string;
  storage_path: string;
  slot: string | null;
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
  role: WaiterRole;
}

export interface ChecklistSignatureRow {
  event_id: string;
  checklist_key: string;
  signed_at: string;
  signed_by_name: string;
  signature_data: string;
  manager_signed_at: string | null;
  manager_signed_by_name: string | null;
  manager_signature_data: string | null;
}
