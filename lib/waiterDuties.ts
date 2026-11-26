import type { EventDuty, EventPhase, WaiterSkill } from "@/lib/types";

export const PHASE_LABELS: Record<EventPhase, string> = {
  event: "כל האירוע",
  reception: "קבלת הפנים",
  hall: "האולם",
};

// Duties with no table/stand, grouped by when they happen. The reception has a
// door waiter, hall-prep waiters and a pilot; runners, the family waiter, the
// hostess and the barista work the whole event. The hall phase has no
// duties of its own - only stands and tables.
export const PHASE_DUTIES: Record<EventPhase, EventDuty[]> = {
  event: ["runner", "family_waiter", "hostess", "barista"],
  reception: ["door", "piloting", "hall_prep"],
  hall: [],
};

export const EVENT_DUTIES: EventDuty[] = [...PHASE_DUTIES.event, ...PHASE_DUTIES.reception];

export function dutyPhase(duty: EventDuty): EventPhase {
  return PHASE_DUTIES.reception.includes(duty) ? "reception" : "event";
}

// How many people the venue wants on a duty. Duties missing here (piloting,
// family, hostess, barista) are manual only.
export const DUTY_QUOTAS: Partial<Record<WaiterSkill, number>> = {
  door: 1,
  runner: 2,
  hall_prep: 6,
};

// The roster file's "תפקיד" column. These rows are not waiters on the floor:
// they are assigned only to their own duty, for the whole event, and nothing
// else. (Dismantling crew - "פירוק" - are ordinary waiters who stay on for it.)
export const SHIFT_ROLE_DUTIES: Record<string, EventDuty> = {
  משפחה: "family_waiter",
  מארחת: "hostess",
  בריסטה: "barista",
};

// A waiter covers at most this many tables.
export const MAX_TABLES_PER_WAITER = 2;
