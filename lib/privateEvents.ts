import type { CurrentStaff } from "@/lib/auth";
import type { PrivateEventType } from "@/lib/types";

// The private-events section belongs to one person, deliberately kept
// completely outside role_permissions/has_permission() so it can never show
// up in - or be granted from - the admin roles screen. Gating is a plain
// identity check instead: the owner's e-mail is app_settings
// 'private_events_owner_email' (not visible to venue admins), mirrored by
// is_private_events_owner() in the DB, which is what actually enforces this at
// the RLS level; this helper only decides what the app renders. With no owner
// set the whole section is off.
export function isPrivateEventsOwner(staff: CurrentStaff | null, ownerEmail: string | null): boolean {
  return !!staff?.email && !!ownerEmail && staff.email.toLowerCase() === ownerEmail.toLowerCase();
}

export const PRIVATE_EVENT_TYPE_LABELS: Record<PrivateEventType, string> = {
  wedding: "חתונה - מזנונים",
  wedding_service: "חתונה - הגשה",
  reverse_wedding: "חתונה הפוכה - מזנונים",
  reverse_wedding_service: "חתונה הפוכה - הגשה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  business_event: "אירוע עסקי",
  other: "אחר",
};
