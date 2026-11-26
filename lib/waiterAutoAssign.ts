import {
  DUTIES_COMPATIBLE_WITH_FLOOR_WORK,
  DUTY_QUOTAS,
  MAX_TABLES_PER_WAITER,
  SHIFT_ROLE_DUTIES,
} from "@/lib/waiterDuties";
import type { EventDuty, LocationType, WaiterSkill } from "@/lib/types";

const FLOOR_COMPATIBLE = new Set<string>(DUTIES_COMPATIBLE_WITH_FLOOR_WORK);

export interface PlanWaiter {
  id: string;
  name: string;
  skills: WaiterSkill[];
  shiftRole: string | null;
}

export interface PlanLocation {
  id: string;
  type: LocationType;
  label: string;
}

export interface PlanExisting {
  waiterId: string;
  locationId: string | null;
  role: string;
}

export interface PlannedAssignment {
  waiterId: string;
  locationId: string | null;
  role: EventDuty;
}

export interface AssignmentPlan {
  assignments: PlannedAssignment[];
  // Duties that wanted more people with the skill than the roster has free.
  shortages: { duty: WaiterSkill; missing: number }[];
  unstaffedLocations: number;
}

// Fills the gaps only - whoever already holds anything (other than door or
// hall prep) keeps their place, and quotas count the duties already staffed.
// Order:
//  0. roster rows for family / hostess / barista go to that duty and nothing
//     else;
//  1. door, runners, hall prep - by skill, up to the venue's numbers, one such
//     duty per person (door and hall prep still leave them free for the floor);
//  2. every food stand gets a waiter - stand-skilled first, anyone free if
//     there are not enough of them;
//  3. the waiters still free cover the tables, up to MAX_TABLES_PER_WAITER
//     each, neighbouring tables together; table-skilled waiters are used first
//     when there are fewer tables than waiters;
//  4. whoever is left over goes to clearing.
// Among equally fit people, those with the fewest skills are used first so
// the flexible ones stay available for the later steps.
export function planSkillAssignments(input: {
  waiters: PlanWaiter[];
  locations: PlanLocation[];
  existing: PlanExisting[];
}): AssignmentPlan {
  const busy = new Set(
    input.existing.filter((a) => a.locationId || !FLOOR_COMPATIBLE.has(a.role)).map((a) => a.waiterId),
  );
  const staffedLocations = new Set(input.existing.map((a) => a.locationId).filter((id): id is string => !!id));
  const dutyCounts = new Map<string, number>();
  for (const a of input.existing) {
    if (!a.locationId) dutyCounts.set(a.role, (dutyCounts.get(a.role) ?? 0) + 1);
  }
  // Someone with a quota duty (door, runner, hall prep) is not given a second one.
  const onQuotaDuty = new Set(
    input.existing.filter((a) => !a.locationId && a.role in DUTY_QUOTAS).map((a) => a.waiterId),
  );

  const assignments: PlannedAssignment[] = [];
  const shortages: AssignmentPlan["shortages"] = [];

  const dedicatedDuty = (waiter: PlanWaiter) => SHIFT_ROLE_DUTIES[waiter.shiftRole?.trim() ?? ""];
  const free = () => input.waiters.filter((w) => !busy.has(w.id) && !dedicatedDuty(w));
  const take = (waiter: PlanWaiter, locationId: string | null, role: EventDuty) => {
    if (!FLOOR_COMPATIBLE.has(role)) busy.add(waiter.id);
    if (!locationId && role in DUTY_QUOTAS) onQuotaDuty.add(waiter.id);
    assignments.push({ waiterId: waiter.id, locationId, role });
  };
  const bySpecialisation = (a: PlanWaiter, b: PlanWaiter) =>
    a.skills.length - b.skills.length || a.name.localeCompare(b.name, "he");
  const withSkill = (skill: WaiterSkill) => free().filter((w) => w.skills.includes(skill)).sort(bySpecialisation);

  // The roster file already says who the family waiter, hostess and barista are.
  for (const waiter of input.waiters.filter((w) => !busy.has(w.id))) {
    const duty = dedicatedDuty(waiter);
    if (duty) take(waiter, null, duty);
  }

  for (const [duty, quota] of Object.entries(DUTY_QUOTAS) as [WaiterSkill, number][]) {
    const needed = quota - (dutyCounts.get(duty) ?? 0);
    if (needed <= 0) continue;
    const picked = withSkill(duty)
      .filter((w) => !onQuotaDuty.has(w.id))
      .slice(0, needed);
    for (const waiter of picked) take(waiter, null, duty);
    if (picked.length < needed) shortages.push({ duty, missing: needed - picked.length });
  }

  const orderedLocations = [...input.locations].sort((a, b) => {
    const aNum = Number(a.label);
    const bNum = Number(b.label);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.label.localeCompare(b.label, "he");
  });

  // Food stands: one waiter each, whatever it takes.
  for (const stand of orderedLocations.filter((l) => l.type === "food_stand" && !staffedLocations.has(l.id))) {
    const person = withSkill("station")[0] ?? free().sort(bySpecialisation)[0];
    if (!person) break;
    take(person, stand.id, "station");
    staffedLocations.add(stand.id);
  }

  // Tables: spread over the free waiters, neighbours together.
  const openTables = orderedLocations.filter((l) => l.type === "table" && !staffedLocations.has(l.id));
  const candidates = free().sort(
    (a, b) =>
      Number(b.skills.includes("table")) - Number(a.skills.includes("table")) ||
      a.skills.length - b.skills.length ||
      a.name.localeCompare(b.name, "he"),
  );
  const covered = openTables.slice(0, candidates.length * MAX_TABLES_PER_WAITER);
  const waiterCount = Math.min(candidates.length, covered.length);
  let cursor = 0;
  for (let i = 0; i < waiterCount; i++) {
    const share = Math.ceil((covered.length - cursor) / (waiterCount - i));
    for (const table of covered.slice(cursor, cursor + share)) {
      take(candidates[i], table.id, "table");
      staffedLocations.add(table.id);
    }
    cursor += share;
  }

  for (const waiter of free().sort(bySpecialisation)) take(waiter, null, "clearing");

  const unstaffedLocations = orderedLocations.filter((l) => !staffedLocations.has(l.id)).length;
  return { assignments, shortages, unstaffedLocations };
}
