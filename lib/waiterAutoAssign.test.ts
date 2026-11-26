import { describe, expect, it } from "vitest";
import { planSkillAssignments, type PlanLocation, type PlanWaiter } from "./waiterAutoAssign";

const waiter = (id: string, skills: PlanWaiter["skills"] = [], shiftRole: string | null = "מקוצרת"): PlanWaiter => ({
  id,
  name: id,
  skills,
  shiftRole,
});
const table = (label: string): PlanLocation => ({ id: `T${label}`, type: "table", label });
const stand = (label: string): PlanLocation => ({ id: `S${label}`, type: "food_stand", label });

const rolesOf = (plan: ReturnType<typeof planSkillAssignments>, id: string) =>
  plan.assignments.filter((a) => a.waiterId === id).map((a) => `${a.phase}:${a.role}${a.locationId ? `@${a.locationId}` : ""}`);

describe("planSkillAssignments", () => {
  it("fills runners (whole event), door and hall prep (reception) by skill up to the quotas", () => {
    const waiters = [
      waiter("d", ["door"]),
      waiter("r1", ["runner"]),
      waiter("r2", ["runner"]),
      waiter("r3", ["runner"]),
      ...["h1", "h2", "h3", "h4", "h5", "h6", "h7"].map((id) => waiter(id, ["hall_prep"])),
    ];
    const plan = planSkillAssignments({ waiters, locations: [], existing: [] });
    const count = (role: string) => plan.assignments.filter((a) => a.role === role);
    expect(count("door")).toHaveLength(1);
    expect(count("runner")).toHaveLength(2);
    expect(count("hall_prep")).toHaveLength(6);
    expect(count("runner").every((a) => a.phase === "event")).toBe(true);
    expect(count("door")[0].phase).toBe("reception");
    expect(plan.shortages).toEqual([]);
  });

  it("reports a shortage when too few have the skill", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("a", ["runner"]), waiter("b")],
      locations: [],
      existing: [],
    });
    expect(plan.shortages).toEqual([
      { duty: "runner", missing: 1 },
      { duty: "door", missing: 1 },
      { duty: "hall_prep", missing: 6 },
    ]);
  });

  it("keeps existing assignments and counts them against the quota", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("old", ["door"]), waiter("new", ["door"])],
      locations: [],
      existing: [{ waiterId: "old", locationId: null, role: "door", phase: "reception" }],
    });
    expect(plan.assignments.filter((a) => a.role === "door")).toEqual([]);
    expect(plan.shortages.map((s) => s.duty)).toEqual(["runner", "hall_prep"]);
  });

  it("sends family, hostess and barista rows to their own duty for the whole event and nothing else", () => {
    const plan = planSkillAssignments({
      waiters: [
        waiter("fam", ["table"], "משפחה"),
        waiter("host", ["table", "door"], "מארחת"),
        waiter("bar", [], "בריסטה"),
        waiter("dis", [], "פירוק"),
      ],
      locations: [stand("A"), table("1")],
      existing: [],
    });
    expect(rolesOf(plan, "fam")).toEqual(["event:family_waiter"]);
    expect(rolesOf(plan, "host")).toEqual(["event:hostess"]);
    expect(rolesOf(plan, "bar")).toEqual(["event:barista"]);
    expect(rolesOf(plan, "dis")).toEqual(["reception:station@SA", "hall:station@SA"]);
  });

  it("lets the door waiter take a stand or tables after the reception, but a runner stays a runner", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("d", ["door", "runner"]), waiter("r", ["runner"]), waiter("r2", ["runner"])],
      locations: [table("1")],
      existing: [],
    });
    expect(rolesOf(plan, "d")).toEqual(["reception:door", "hall:table@T1"]);
    expect(rolesOf(plan, "r")).toEqual(["event:runner"]);
    expect(rolesOf(plan, "r2")).toEqual(["event:runner"]);
  });

  it("puts a waiter on every stand in both phases, even if nobody has the stand skill", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("s1", ["station"]), waiter("a"), waiter("b")],
      locations: [stand("1"), stand("2"), stand("3")],
      existing: [],
    });
    expect(plan.assignments.filter((a) => a.role === "station" && a.phase === "reception")).toHaveLength(3);
    expect(plan.assignments.filter((a) => a.role === "station" && a.phase === "hall")).toHaveLength(3);
    expect(plan.unstaffed).toEqual({ receptionStands: 0, hallStands: 0, tables: 0 });
  });

  it("covers the hall tables with the waiters not on stands, two tables at most each, neighbours together", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("a"), waiter("b"), waiter("c"), waiter("d"), waiter("st", ["station"])],
      locations: [stand("S"), ...["1", "2", "3", "4", "5", "6", "7"].map(table)],
      existing: [],
    });
    const hallStand = plan.assignments.find((a) => a.phase === "hall" && a.role === "station");
    expect(hallStand?.waiterId).toBe("st");
    const perWaiter = new Map<string, string[]>();
    for (const a of plan.assignments.filter((x) => x.role === "table")) {
      perWaiter.set(a.waiterId, [...(perWaiter.get(a.waiterId) ?? []), a.locationId!]);
    }
    expect([...perWaiter.values()].map((t) => t.length).sort()).toEqual([1, 2, 2, 2]);
    expect([...perWaiter.values()]).toContainEqual(["T1", "T2"]);
    expect(plan.unstaffed.tables).toBe(0);
  });

  it("never gives tables in the reception phase", () => {
    const plan = planSkillAssignments({ waiters: [waiter("a")], locations: [table("1")], existing: [] });
    expect(plan.assignments.filter((a) => a.role === "table").every((a) => a.phase === "hall")).toBe(true);
  });

  it("leaves tables open when even two each is not enough", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("a"), waiter("b")],
      locations: ["1", "2", "3", "4", "5"].map(table),
      existing: [],
    });
    expect(plan.assignments.filter((a) => a.role === "table")).toHaveLength(4);
    expect(plan.unstaffed.tables).toBe(1);
  });

  it("uses table-skilled waiters first when tables are few", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("a"), waiter("t", ["table"]), waiter("b")],
      locations: [table("1")],
      existing: [],
    });
    expect(plan.assignments.find((x) => x.role === "table")?.waiterId).toBe("t");
  });

  it("uses the most specialised waiter first so flexible ones stay free", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("flex", ["door", "runner", "table"]), waiter("only", ["door"])],
      locations: [],
      existing: [],
    });
    expect(plan.assignments.find((a) => a.role === "door")?.waiterId).toBe("only");
  });

  it("never re-places someone who already holds a place in that phase", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("a", ["door"])],
      locations: [table("1")],
      existing: [{ waiterId: "a", locationId: "T1", role: "table", phase: "hall" }],
    });
    expect(rolesOf(plan, "a")).toEqual(["reception:door"]);
  });

  it("sends everyone left in the reception to clearing, and they are still free for the hall", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("d", ["door"]), waiter("a"), waiter("b"), waiter("c")],
      locations: [stand("S"), table("1"), table("2")],
      existing: [],
    });
    // door -> d; stand -> one of a/b/c; the other two clear
    expect(plan.assignments.filter((x) => x.role === "clearing" && x.phase === "reception")).toHaveLength(2);
    expect(plan.assignments.filter((x) => x.role === "clearing").every((x) => x.locationId === null)).toBe(true);
    // clearing in the reception does not use up anyone in the hall
    expect(plan.assignments.filter((x) => x.role === "table")).toHaveLength(2);
    expect(plan.unstaffed).toEqual({ receptionStands: 0, hallStands: 0, tables: 0 });
  });

  it("gives the single joker to one waiter for the whole event, so they get no stand or table", () => {
    const plan = planSkillAssignments({
      waiters: [waiter("j", ["joker"]), waiter("j2", ["joker"]), waiter("a")],
      locations: [table("1"), table("2")],
      existing: [],
    });
    const jokers = plan.assignments.filter((x) => x.role === "joker");
    expect(jokers).toHaveLength(1);
    expect(jokers[0].phase).toBe("event");
    const jokerId = jokers[0].waiterId;
    expect(plan.assignments.filter((x) => x.waiterId === jokerId)).toHaveLength(1);
  });
});
