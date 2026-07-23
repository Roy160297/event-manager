export const RESOURCES = [
  "events",
  "tasks",
  "timeline",
  "guests",
  "staffing",
  "closing_checklist",
  "event_summary_report",
  "floor_manager_checklist",
  "bar_checklist",
  "kitchen_checklist",
  "barista_checklist",
  "couple_meeting",
  "event_management_dex",
  "waiters",
  "admin",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  events: "סקירה",
  tasks: "משימות",
  timeline: "לוח זמנים",
  guests: "אורחים",
  staffing: "שיבוץ מלצרים",
  closing_checklist: "צ'קליסט סגירה - מנהל אירוע",
  event_summary_report: "דוח סיכום אירוע - מנהל אירוע",
  floor_manager_checklist: "צ'קליסט סגירה - מנהל פלור",
  bar_checklist: "צ'קליסט סגירה - בר",
  kitchen_checklist: "צ'קליסט סגירה - מטבח",
  barista_checklist: "צ'קליסט סגירה - בריסטה",
  couple_meeting: "פגישה עם זוג",
  event_management_dex: "ניהול אירוע (Dex)",
  waiters: "מלצרים (רשימה כללית)",
  admin: "ניהול משתמשים והרשאות",
};

export type PermissionMap = Record<Resource, { read: boolean; write: boolean }>;

// Write implies read: a role granted write on a resource can always view it
// too, so admins don't need to double-grant both flags for the common case.
export function canRead(permissions: PermissionMap, resource: Resource): boolean {
  const perm = permissions[resource];
  return !!perm && (perm.read || perm.write);
}

export function canWrite(permissions: PermissionMap, resource: Resource): boolean {
  return permissions[resource]?.write ?? false;
}
