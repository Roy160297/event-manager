// Fixed permission areas. Each closing checklist is also a permission resource, but
// those are defined in the database (the checklists table) and added to this list
// at runtime - see permissionResourceList below.
export const RESOURCES = [
  "events",
  "tasks",
  "timeline",
  "guests",
  "staffing",
  "event_summary_report",
  "couple_meeting",
  "event_management_dex",
  "waiters",
  "admin",
  "my_tasks",
  "menu",
  "calendar",
  "push_reminder_rules",
  "venue_settings",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  events: "אירועים (סקירה)",
  tasks: "משימות",
  timeline: "לוח זמנים",
  guests: "אורחים",
  staffing: "סקיצה + מלצרים",
  event_summary_report: "דוח סיכום אירוע",
  couple_meeting: "פגישה עם זוג",
  event_management_dex: 'סד"פ ניהול אירוע',
  waiters: "מלצרים (רשימה כללית)",
  admin: "ניהול משתמשים והרשאות",
  my_tasks: "המשימות שלי",
  menu: "תפריט",
  calendar: "יומן",
  push_reminder_rules: "התראות ותזכורות",
  venue_settings: "הגדרות האולם",
};

// Every permission area a role can be given: the fixed ones plus one per checklist
// (the role grid and new-role defaults use this list).
export function permissionResourceList(checklists: { key: string; label: string }[]): { key: string; label: string }[] {
  return [
    ...RESOURCES.map((key) => ({ key: key as string, label: RESOURCE_LABELS[key] })),
    ...checklists.map((checklist) => ({ key: checklist.key, label: checklist.label })),
  ];
}

// Keyed by any resource string: the fixed ones above plus one per checklist.
export type PermissionMap = Record<string, { read: boolean; write: boolean }>;

// Write implies read: a role granted write on a resource can always view it
// too, so admins don't need to double-grant both flags for the common case.
export function canRead(permissions: PermissionMap, resource: string): boolean {
  const perm = permissions[resource];
  return !!perm && (perm.read || perm.write);
}

export function canWrite(permissions: PermissionMap, resource: string): boolean {
  return permissions[resource]?.write ?? false;
}
