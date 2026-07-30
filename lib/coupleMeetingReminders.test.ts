import { describe, expect, it } from "vitest";
import { addDaysToDate, COUPLE_MEETING_REMINDER_RULES } from "@/lib/coupleMeetingReminders";

describe("addDaysToDate", () => {
  it("subtracts days within the same month", () => {
    expect(addDaysToDate("2026-08-10", -3)).toBe("2026-08-07");
  });

  it("adds days within the same month", () => {
    expect(addDaysToDate("2026-08-10", 1)).toBe("2026-08-11");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysToDate("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysToDate("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("COUPLE_MEETING_REMINDER_RULES", () => {
  it("has a unique key per rule", () => {
    const keys = COUPLE_MEETING_REMINDER_RULES.map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("renders the couple name and event date into the body", () => {
    for (const rule of COUPLE_MEETING_REMINDER_RULES) {
      const body = rule.body("שי קטש וגיל מזרחי", "2026-08-14");
      expect(body).toContain("שי קטש וגיל מזרחי");
      expect(body).toContain("14/08/2026");
    }
  });

  it("marks the final-commitment rule as onOrAfter, so an event created/edited with fewer days left than the offset still fires", () => {
    const rule = COUPLE_MEETING_REMINDER_RULES.find((r) => r.key === "final-commitment-and-sketch-update");
    expect(rule?.matchMode).toBe("onOrAfter");
  });
});
