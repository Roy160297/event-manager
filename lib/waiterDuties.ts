import type { EventDuty, WaiterSkill } from "@/lib/types";

// Duties a waiter can hold for the whole event, with no table/stand attached.
// (Tables and food stands are the other two skills, assigned per location.)
export const EVENT_DUTIES: EventDuty[] = [
  "door",
  "runner",
  "hall_prep",
  "clearing",
  "piloting",
  "family_waiter",
  "hostess",
  "barista",
];

// How many people the venue wants on a duty. Clearing has no number - it takes
// everyone who is left. Duties missing here are manual only.
export const DUTY_QUOTAS: Partial<Record<WaiterSkill, number>> = {
  door: 1,
  runner: 2,
  hall_prep: 6,
};

// Door is only the reception, hall prep only the set-up: both leave the waiter
// free for a stand, tables or any other duty afterwards. Every other duty
// takes the waiter fully.
export const DUTIES_COMPATIBLE_WITH_FLOOR_WORK: EventDuty[] = ["hall_prep", "door"];

// The roster file's "תפקיד" column. These rows are not waiters on the floor:
// they are assigned only to their own duty, and nothing else.
// (Dismantling crew - "פירוק" - are ordinary waiters who stay on for it.)
export const SHIFT_ROLE_DUTIES: Record<string, EventDuty> = {
  משפחה: "family_waiter",
  מארחת: "hostess",
  בריסטה: "barista",
};

// A waiter covers at most this many tables.
export const MAX_TABLES_PER_WAITER = 2;
