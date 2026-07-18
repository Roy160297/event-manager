export const RESOURCES = ["events", "guests", "tasks", "timeline", "staffing", "waiters", "admin"] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  events: "אירועים",
  guests: "אורחים",
  tasks: "משימות",
  timeline: "לוח זמנים",
  staffing: "צוות הגשה",
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
