import type { WaiterSkill } from "@/lib/types";

// Duties a waiter can hold for the whole event, with no table/stand attached.
// (Tables and food stands are the other two skills, assigned per location.)
export const EVENT_DUTIES: WaiterSkill[] = ["door", "runner", "hall_prep", "clearing", "piloting", "family_waiter"];

// How many people the venue wants on a duty. Clearing has no number - it takes
// everyone who is left. Duties missing here (piloting, family) are manual only.
export const DUTY_QUOTAS: Partial<Record<WaiterSkill, number>> = {
  door: 1,
  runner: 2,
  hall_prep: 6,
};

// Hall prep happens before the event, so whoever does it still works the floor
// (a stand or tables) afterwards; every other duty takes the waiter fully.
export const DUTIES_COMPATIBLE_WITH_FLOOR_WORK: WaiterSkill[] = ["hall_prep"];

// The roster file's "תפקיד" column. A "משפחה" row is the family waiter; hostess
// and barista are not waiters, so the automatic assignment leaves them alone.
// (Dismantling crew - "פירוק" - are ordinary waiters who stay on for it.)
export const FAMILY_SHIFT_ROLE = "משפחה";
export const NON_FLOOR_SHIFT_ROLES = ["מארחת", "בריסטה"];

// A waiter covers at most this many tables.
export const MAX_TABLES_PER_WAITER = 2;
