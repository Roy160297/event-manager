import { DUTY_QUOTAS, MAX_TABLES_PER_WAITER, SHIFT_ROLE_DUTIES, dutyPhase } from "@/lib/waiterDuties";
import type { EventDuty, EventPhase, LocationType, WaiterSkill } from "@/lib/types";

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
  phase: EventPhase;
}

export interface PlannedAssignment {
  waiterId: string;
  locationId: string | null;
  role: EventDuty;
  phase: EventPhase;
}

export interface AssignmentPlan {
  assignments: PlannedAssignment[];
  // Duties that wanted more people with the skill than the roster has free.
  shortages: { duty: WaiterSkill; missing: number }[];
  // Stands and tables that no free waiter was left for.
  unstaffed: { receptionStands: number; hallStands: number; tables: number };
}

type FloorPhase = "reception" | "hall";

// Fills the gaps only - someone already placed in a phase keeps that place, and
// quotas count the duties already staffed. The event has two phases and a
// waiter can be busy in one and free in the other:
//  0. roster rows for family / hostess / barista go to that duty for the whole
//     event and nothing else;
//  1. runners - by skill, for the whole event;
//  2. reception: the door waiter, then hall prep - by skill, up to the venue's
//     numbers (piloting is manual);
//  3. reception stands: one waiter each - stand-skilled first, anyone free if
//     there are not enough of them - and then everyone still free clears;
//  4. hall stands: the same;
//  5. hall tables: the waiters still free cover them, up to
//     MAX_TABLES_PER_WAITER each, neighbouring tables together; table-skilled
//     waiters are used first when there are fewer tables than waiters.
// Among equally fit people, those with the fewest skills are used first so the
// flexible ones stay available for the later steps.
export function planSkillAssignments(input: {
  waiters: PlanWaiter[];
  locations: PlanLocation[];
  existing: PlanExisting[];
}): AssignmentPlan {
  const busy: Record<FloorPhase, Set<string>> = { reception: new Set(), hall: new Set() };
  const markBusy = (waiterId: string, phase: EventPhase) => {
    if (phase !== "hall") busy.reception.add(waiterId);
    if (phase !== "reception") busy.hall.add(waiterId);
  };
  for (const a of input.existing) markBusy(a.waiterId, a.phase);

  const staffed = new Set(input.existing.filter((a) => a.locationId).map((a) => `${a.phase}:${a.locationId}`));
  const dutyCounts = new Map<string, number>();
  for (const a of input.existing) {
    if (!a.locationId) dutyCounts.set(a.role, (dutyCounts.get(a.role) ?? 0) + 1);
  }

  const assignments: PlannedAssignment[] = [];
  const shortages: AssignmentPlan["shortages"] = [];

  const dedicatedDuty = (waiter: PlanWaiter) => SHIFT_ROLE_DUTIES[waiter.shiftRole?.trim() ?? ""];
  // Free in a phase (or, for "event", in both).
  const free = (phase: EventPhase) =>
    input.waiters.filter(
      (w) =>
        !dedicatedDuty(w) &&
        (phase === "event" ? !busy.reception.has(w.id) && !busy.hall.has(w.id) : !busy[phase].has(w.id)),
    );
  const take = (waiter: PlanWaiter, locationId: string | null, role: EventDuty, phase: EventPhase) => {
    markBusy(waiter.id, phase);
    if (locationId) staffed.add(`${phase}:${locationId}`);
    assignments.push({ waiterId: waiter.id, locationId, role, phase });
  };
  const bySpecialisation = (a: PlanWaiter, b: PlanWaiter) =>
    a.skills.length - b.skills.length || a.name.localeCompare(b.name, "he");
  const withSkill = (phase: EventPhase, skill: WaiterSkill) =>
    free(phase).filter((w) => w.skills.includes(skill)).sort(bySpecialisation);

  // The roster file already says who the family waiter, hostess and barista are.
  for (const waiter of input.waiters) {
    const duty = dedicatedDuty(waiter);
    if (duty && !busy.reception.has(waiter.id) && !busy.hall.has(waiter.id)) take(waiter, null, duty, "event");
  }

  for (const duty of ["runner", "door", "hall_prep"] as const) {
    const quota = DUTY_QUOTAS[duty] ?? 0;
    const needed = quota - (dutyCounts.get(duty) ?? 0);
    if (needed <= 0) continue;
    const phase = dutyPhase(duty);
    const picked = withSkill(phase, duty).slice(0, needed);
    for (const waiter of picked) take(waiter, null, duty, phase);
    if (picked.length < needed) shortages.push({ duty, missing: needed - picked.length });
  }

  const orderedLocations = [...input.locations].sort((a, b) => {
    const aNum = Number(a.label);
    const bNum = Number(b.label);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.label.localeCompare(b.label, "he");
  });
  const stands = orderedLocations.filter((l) => l.type === "food_stand");
  const tables = orderedLocations.filter((l) => l.type === "table");

  // One waiter on every stand, in each phase.
  const staffStands = (phase: FloorPhase) => {
    for (const stand of stands.filter((l) => !staffed.has(`${phase}:${l.id}`))) {
      const person = withSkill(phase, "station")[0] ?? free(phase).sort(bySpecialisation)[0];
      if (!person) break;
      take(person, stand.id, "station", phase);
    }
  };
  staffStands("reception");
  // Everyone still free in the reception clears - the number differs per event.
  for (const waiter of free("reception").sort(bySpecialisation)) take(waiter, null, "clearing", "reception");
  staffStands("hall");

  // Tables (hall only): spread over the free waiters, neighbours together.
  const openTables = tables.filter((l) => !staffed.has(`hall:${l.id}`));
  const candidates = free("hall").sort(
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
    for (const table of covered.slice(cursor, cursor + share)) take(candidates[i], table.id, "table", "hall");
    cursor += share;
  }

  return {
    assignments,
    shortages,
    unstaffed: {
      receptionStands: stands.filter((l) => !staffed.has(`reception:${l.id}`)).length,
      hallStands: stands.filter((l) => !staffed.has(`hall:${l.id}`)).length,
      tables: tables.filter((l) => !staffed.has(`hall:${l.id}`)).length,
    },
  };
}
