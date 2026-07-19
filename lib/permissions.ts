export const RESOURCES = ["events", "guests", "tasks", "closing_checklist", "timeline", "staffing", "waiters", "admin"] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  events: "סקירה",
  guests: "אורחים",
  tasks: "משימות",
  closing_checklist: "צ'קליסט סגירה",
  timeline: "לוח זמנים",
  staffing: "מלצרים (אירוע)",
  waiters: "מלצרים (רשימה כללית)",
  admin: "ניהול משתמשים והרשאות",
};

export type PermissionMap = Record<Resource, { read: boolean; write: boolean }>;

export function canRead(permissions: PermissionMap, resource: Resource): boolean {
  return permissions[resource]?.read ?? false;
}

export function canWrite(permissions: PermissionMap, resource: Resource): boolean {
  return permissions[resource]?.write ?? false;
}
