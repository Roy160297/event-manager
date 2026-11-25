import { describe, expect, it } from "vitest";
import { planSkillAssignments, type PlanWaiter } from "./waiterAutoAssign";

const waiter = (id: string, skills: PlanWaiter["skills"] = [], shiftRole: string | null = "מקוצרת"): PlanWaiter => ({
  id,
  name: id,
  skills,
  shiftRole,
});

describe("planSkillAssignments", () => {
  it("fills door, runners and hall prep by skill, then clearing for the rest", () => {
    const waiters = [
      waiter("d", ["door"]),
      waiter("r1", ["runner"]),
      waiter("r2", ["runner"]),
      waiter("r3", ["runner"]),
      ...["h1", "h2", "h3", "h4", "h5", "h6", "h7"].map((id) => waiter(id, ["hall_prep"])),
      waiter("x"),
    ];
    const { assignments, shortages } = planSkillAssignments({ waiters, locations: [], existing: [] });
    const roleOf = (id: string) => assignments.find((a) => a.waiterId === id)?.role;
    expect(assignments.filter((a) => a.role === "door")).toHaveLength(1);
    expect(assignments.filter((a) => a.role === "runner")).toHaveLength(2);
    expect(assignments.filter((a) => a.role === "hall_prep")).toHaveLength(6);
    expect(roleOf("r3")).toBe("clearing");
    expect(roleOf("h7")).toBe("clearing");
    expect(roleOf("x")).toBe("clearing");
    expect(shortages).toEqual([]);
    expect(assignments.every((a) => a.locationId === null)).toBe(true);
  });

  it("reports a shortage when too few have the skill, and leaves them out of that duty", () => {
    const { assignments, shortages } = planSkillAssignments({
      waiters: [waiter("a", ["runner"]), waiter("b")],
      locations: [],
      existing: [],
    });
    expect(shortages).toEqual([
      { duty: "door", missing: 1 },
      { duty: "runner", missing: 1 },
      { duty: "hall_prep", missing: 6 },
    ]);
    expect(assignments.find((a) => a.waiterId === "a")?.role).toBe("runner");
    expect(assignments.find((a) => a.waiterId === "b")?.role).toBe("clearing");
  });

  it("keeps existing assignments and counts them against the quota", () => {
    const { assignments, shortages } = planSkillAssignments({
      waiters: [waiter("old", ["door"]), waiter("new", ["door"])],
      locations: [],
      existing: [{ waiterId: "old", locationId: null, role: "door" }],
    });
    expect(assignments).toEqual([{ waiterId: "new", locationId: null, role: "clearing" }]);
    expect(shortages.map((s) => s.duty)).toEqual(["runner", "hall_prep"]);
  });

  it("puts table-skilled waiters on open tables in numeric order, and stand-skilled on stands", () => {
    const { assignments, unstaffedLocations } = planSkillAssignments({
      waiters: [waiter("t1", ["table"]), waiter("t2", ["table"]), waiter("s1", ["station"])],
      locations: [
        { id: "L10", type: "table", label: "10" },
        { id: "L2", type: "table", label: "2" },
        { id: "L3", type: "table", label: "3" },
        { id: "S", type: "food_stand", label: "סושי" },
      ],
      existing: [],
    });
    expect(assignments).toEqual([
      { waiterId: "s1", locationId: "S", role: "station" },
      { waiterId: "t1", locationId: "L2", role: "table" },
      { waiterId: "t2", locationId: "L3", role: "table" },
    ]);
    expect(unstaffedLocations).toBe(1);
  });

  it("uses the most specialised waiter first so flexible ones stay free", () => {
    const { assignments } = planSkillAssignments({
      waiters: [waiter("flex", ["door", "runner", "table"]), waiter("only", ["door"])],
      locations: [],
      existing: [],
    });
    expect(assignments.find((a) => a.role === "door")?.waiterId).toBe("only");
  });

  it("sends the family waiter to that duty and leaves hostess/barista/dismantling out", () => {
    const { assignments } = planSkillAssignments({
      waiters: [
        waiter("fam", [], "משפחה"),
        waiter("host", [], "מארחת"),
        waiter("bar", [], "בריסטה"),
        waiter("dis", [], "פירוק"),
        waiter("w"),
      ],
      locations: [],
      existing: [],
    });
    expect(assignments.map((a) => [a.waiterId, a.role])).toEqual([
      ["fam", "family_waiter"],
      ["w", "clearing"],
    ]);
  });

  it("never assigns someone who already holds a table", () => {
    const { assignments } = planSkillAssignments({
      waiters: [waiter("a", ["door"])],
      locations: [{ id: "L1", type: "table", label: "1" }],
      existing: [{ waiterId: "a", locationId: "L1", role: "table" }],
    });
    expect(assignments).toEqual([]);
  });
});
