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

  it("puts a waiter on every food stand, even if nobody has the stand skill", () => {
    const { assignments, unstaffedLocations } = planSkillAssignments({
      waiters: [waiter("s1", ["station"]), waiter("a"), waiter("b")],
      locations: [
        { id: "S1", type: "food_stand", label: "סושי" },
        { id: "S2", type: "food_stand", label: "פסטה" },
        { id: "S3", type: "food_stand", label: "בשר" },
      ],
      existing: [],
    });
    expect(assignments.filter((a) => a.role === "station")).toHaveLength(3);
    expect(assignments.some((a) => a.waiterId === "s1" && a.role === "station")).toBe(true);
    expect(unstaffedLocations).toBe(0);
  });

  it("covers the tables with the waiters who are not on stands, two tables at most each", () => {
    const tables = ["1", "2", "3", "4", "5", "6", "7"].map((label) => ({ id: `T${label}`, type: "table" as const, label }));
    const { assignments, unstaffedLocations } = planSkillAssignments({
      waiters: [waiter("a"), waiter("b"), waiter("c"), waiter("d"), waiter("st", ["station"])],
      locations: [{ id: "S", type: "food_stand", label: "סושי" }, ...tables],
      existing: [],
    });
    expect(assignments.find((a) => a.locationId === "S")?.waiterId).toBe("st");
    const perWaiter = new Map<string, string[]>();
    for (const a of assignments.filter((x) => x.role === "table")) {
      perWaiter.set(a.waiterId, [...(perWaiter.get(a.waiterId) ?? []), a.locationId!]);
    }
    expect([...perWaiter.values()].map((t) => t.length).sort()).toEqual([1, 2, 2, 2]);
    // neighbouring tables stay together
    expect([...perWaiter.values()]).toContainEqual(["T1", "T2"]);
    expect(unstaffedLocations).toBe(0);
  });

  it("leaves tables open when even two each is not enough", () => {
    const tables = ["1", "2", "3", "4", "5"].map((label) => ({ id: `T${label}`, type: "table" as const, label }));
    const { assignments, unstaffedLocations } = planSkillAssignments({
      waiters: [waiter("a"), waiter("b")],
      locations: tables,
      existing: [],
    });
    expect(assignments.filter((a) => a.role === "table")).toHaveLength(4);
    expect(unstaffedLocations).toBe(1);
  });

  it("uses table-skilled waiters first and sends the surplus to clearing when tables are few", () => {
    const { assignments } = planSkillAssignments({
      waiters: [waiter("a"), waiter("t", ["table"]), waiter("b")],
      locations: [{ id: "T1", type: "table", label: "1" }],
      existing: [],
    });
    expect(assignments.find((x) => x.role === "table")?.waiterId).toBe("t");
    expect(assignments.filter((x) => x.role === "clearing")).toHaveLength(2);
  });

  it("lets hall prep people also work the floor", () => {
    const { assignments } = planSkillAssignments({
      waiters: [waiter("h", ["hall_prep"])],
      locations: [{ id: "T1", type: "table", label: "1" }],
      existing: [],
    });
    expect(assignments.map((x) => x.role).sort()).toEqual(["hall_prep", "table"]);
  });

  it("uses the most specialised waiter first so flexible ones stay free", () => {
    const { assignments } = planSkillAssignments({
      waiters: [waiter("flex", ["door", "runner", "table"]), waiter("only", ["door"])],
      locations: [],
      existing: [],
    });
    expect(assignments.find((a) => a.role === "door")?.waiterId).toBe("only");
  });

  it("sends the family waiter to that duty and leaves hostess/barista out", () => {
    const { assignments } = planSkillAssignments({
      waiters: [
        waiter("fam", [], "משפחה"),
        waiter("host", [], "מארחת"),
        waiter("bar", [], "בריסטה"),
        waiter("dis", [], "פירוק"),
      ],
      locations: [],
      existing: [],
    });
    expect(assignments.map((a) => [a.waiterId, a.role])).toEqual([
      ["fam", "family_waiter"],
      ["dis", "clearing"],
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
