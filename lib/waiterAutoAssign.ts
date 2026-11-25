import { DUTY_QUOTAS, FAMILY_SHIFT_ROLE, NON_FLOOR_SHIFT_ROLES } from "@/lib/waiterDuties";
import type { LocationType, WaiterSkill } from "@/lib/types";

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
  role: WaiterSkill;
}

export interface AssignmentPlan {
  assignments: PlannedAssignment[];
  // Duties that wanted more people with the skill than the roster has free.
  shortages: { duty: WaiterSkill; missing: number }[];
  unstaffedLocations: number;
}

// Fills the gaps only - whoever is already assigned to anything keeps their
// place, and quotas count the duties already staffed. Order: the small fixed
// duties first (door, runners, hall prep), then food stands, then tables, and
// finally everyone still free goes to clearing. Among the people who have the
// needed skill, those with the fewest skills are used first so the flexible
// ones stay available for the later steps.
export function planSkillAssignments(input: {
  waiters: PlanWaiter[];
  locations: PlanLocation[];
  existing: PlanExisting[];
}): AssignmentPlan {
  const busy = new Set(input.existing.map((a) => a.waiterId));
  const staffedLocations = new Set(input.existing.map((a) => a.locationId).filter((id): id is string => !!id));
  const dutyCounts = new Map<string, number>();
  for (const a of input.existing) {
    if (!a.locationId) dutyCounts.set(a.role, (dutyCounts.get(a.role) ?? 0) + 1);
  }

  const assignments: PlannedAssignment[] = [];
  const shortages: AssignmentPlan["shortages"] = [];

  const isFloorStaff = (waiter: PlanWaiter) =>
    !waiter.shiftRole || !NON_FLOOR_SHIFT_ROLES.includes(waiter.shiftRole.trim());
  const free = () => input.waiters.filter((w) => !busy.has(w.id) && isFloorStaff(w));
  const take = (waiter: PlanWaiter, locationId: string | null, role: WaiterSkill) => {
    busy.add(waiter.id);
    assignments.push({ waiterId: waiter.id, locationId, role });
  };
  const bySpecialisation = (a: PlanWaiter, b: PlanWaiter) =>
    a.skills.length - b.skills.length || a.name.localeCompare(b.name, "he");
  const withSkill = (skill: WaiterSkill) => free().filter((w) => w.skills.includes(skill)).sort(bySpecialisation);

  // The roster file already says who the family waiter is.
  for (const waiter of free()) {
    if (waiter.shiftRole?.trim() === FAMILY_SHIFT_ROLE) take(waiter, null, "family_waiter");
  }

  for (const [duty, quota] of Object.entries(DUTY_QUOTAS) as [WaiterSkill, number][]) {
    const needed = quota - (dutyCounts.get(duty) ?? 0);
    if (needed <= 0) continue;
    const picked = withSkill(duty).slice(0, needed);
    for (const waiter of picked) take(waiter, null, duty);
    if (picked.length < needed) shortages.push({ duty, missing: needed - picked.length });
  }

  const orderedLocations = [...input.locations].sort((a, b) => {
    const aNum = Number(a.label);
    const bNum = Number(b.label);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.label.localeCompare(b.label, "he");
  });
  for (const [type, skill] of [
    ["food_stand", "station"],
    ["table", "table"],
  ] as const) {
    const open = orderedLocations.filter((l) => l.type === type && !staffedLocations.has(l.id));
    const people = withSkill(skill);
    open.slice(0, people.length).forEach((location, index) => {
      take(people[index], location.id, skill);
      staffedLocations.add(location.id);
    });
  }

  for (const waiter of free().sort(bySpecialisation)) take(waiter, null, "clearing");

  const unstaffedLocations = orderedLocations.filter((l) => !staffedLocations.has(l.id)).length;
  return { assignments, shortages, unstaffedLocations };
}
