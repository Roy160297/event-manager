import type { CurrentStaff } from "@/lib/auth";
import type { PrivateEventType } from "@/lib/types";

// This whole section is Roy's own private-event admin, deliberately kept
// completely outside role_permissions/has_permission() so it can never show
// up in - or be granted from - the admin roles screen. Gating is a plain
// hardcoded identity check instead, mirrored by is_private_events_owner() in
// the DB (see 00000000000060_private_events.sql), which is what actually
// enforces this at the RLS level; this helper only decides what the app
// renders.
const OWNER_EMAIL = "roy1602@gmail.com";

export function isPrivateEventsOwner(staff: CurrentStaff | null): boolean {
  return staff?.email === OWNER_EMAIL;
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
