import { describe, expect, it } from "vitest";
import { addHoursToTime, fridayEndTime, isFriday } from "@/lib/scheduleTime";

describe("isFriday", () => {
  it("returns true for a known Friday", () => {
    expect(isFriday("2026-08-14")).toBe(true);
  });

  it("returns false for a known non-Friday", () => {
    expect(isFriday("2026-08-15")).toBe(false);
  });

  it("returns false for null/empty input", () => {
    expect(isFriday(null)).toBe(false);
    expect(isFriday("")).toBe(false);
  });
});

describe("addHoursToTime", () => {
  it("adds a whole number of hours within the same day", () => {
    expect(addHoursToTime("12:00", 3)).toBe("15:00");
  });

  it("adds a fractional (half-hour) offset", () => {
    expect(addHoursToTime("12:00", 6.5)).toBe("18:30");
  });

  it("wraps past midnight", () => {
    expect(addHoursToTime("22:00", 3)).toBe("01:00");
  });

  it("returns null for an unparseable time", () => {
    expect(addHoursToTime("not-a-time", 3)).toBeNull();
  });
});

describe("fridayEndTime", () => {
  it("is always 6.5 hours after the given start time", () => {
    expect(fridayEndTime("12:00")).toBe("18:30");
  });
});
