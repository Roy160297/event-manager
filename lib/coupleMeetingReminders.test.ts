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
    const sampleEvent = {
      name: "שי קטש וגיל מזרחי",
      event_date: "2026-08-14",
      estimated_guests: "200+14",
      kids_meal_count: "10",
      glat_meal_count: "5",
      vegetarian_meal_count: "8",
      vegan_meal_count: "3",
      gluten_free_meal_count: "2",
      toddlers_under_2_count: "1",
    };
    for (const rule of COUPLE_MEETING_REMINDER_RULES) {
      const body = rule.body(sampleEvent);
      expect(body).toContain("שי קטש וגיל מזרחי");
      expect(body).toContain("14/08/2026");
    }
  });

  it("marks the final-commitment rule as onOrAfter, so an event created/edited with fewer days left than the offset still fires", () => {
    const rule = COUPLE_MEETING_REMINDER_RULES.find((r) => r.key === "final-commitment-and-sketch-update");
    expect(rule?.matchMode).toBe("onOrAfter");
  });
});
