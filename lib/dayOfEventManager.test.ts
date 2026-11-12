import { describe, expect, it } from "vitest";
import { findDayOfEventManager, isManagedBy } from "@/lib/dayOfEventManager";

describe("findDayOfEventManager", () => {
  it("finds him by name among the event managers", () => {
    const people = [{ id: "a", name: "ניר חדד" }, { id: "b", name: " אלדר " }];
    expect(findDayOfEventManager(people)?.id).toBe("b");
  });

  it("returns null when he is not there", () => {
    expect(findDayOfEventManager([{ id: "a", name: "ניר חדד" }])).toBeNull();
    expect(findDayOfEventManager(null)).toBeNull();
  });
});

describe("isManagedBy", () => {
  const today = "2026-11-12";

  it("matches the assigned manager on any date", () => {
    expect(isManagedBy({ manager_id: "m", event_date: "2026-12-01" }, "m", "e", today)).toBe(true);
  });

  it("gives the day-of manager today's events, whoever manages them", () => {
    expect(isManagedBy({ manager_id: "m", event_date: today }, "e", "e", today)).toBe(true);
    expect(isManagedBy({ manager_id: null, event_date: today }, "e", "e", today)).toBe(true);
  });

  it("does not give him other days' events", () => {
    expect(isManagedBy({ manager_id: "m", event_date: "2026-11-13" }, "e", "e", today)).toBe(false);
  });

  it("does not give today's events to any other manager", () => {
    expect(isManagedBy({ manager_id: "m", event_date: today }, "x", "e", today)).toBe(false);
  });
});
