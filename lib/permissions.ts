export const RESOURCES = [
  "events",
  "guests",
  "tasks",
  "closing_checklist",
  "event_summary_report",
  "timeline",
  "staffing",
  "waiters",
  "admin",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  events: "סקירה",
  guests: "אורחים",
  tasks: "משימות",
  closing_checklist: "צ'קליסט סגירה - מנהל אירוע",
  event_summary_report: "דוח סיכום אירוע",
  timeline: "לוח זמנים",
  staffing: "שיבוץ מלצרים",
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
