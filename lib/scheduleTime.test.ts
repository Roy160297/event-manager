import { describe, expect, it } from "vitest";
import { addHoursToTime, fridayEndTime, isFriday, todaysEventDate } from "@/lib/scheduleTime";

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

describe("todaysEventDate", () => {
  it("still counts as the previous day just before the 6am cutoff (Israel time)", () => {
    // 2026-08-07T01:30 in Asia/Jerusalem (IDT, UTC+3) == 2026-08-06T22:30Z
    expect(todaysEventDate(new Date("2026-08-06T22:30:00Z"))).toBe("2026-08-06");
  });

  it("flips to the new day once the 6am cutoff has passed", () => {
    // 2026-08-07T10:00 in Asia/Jerusalem (IDT, UTC+3) == 2026-08-07T07:00Z
    expect(todaysEventDate(new Date("2026-08-07T07:00:00Z"))).toBe("2026-08-07");
  });

  it("treats exactly 6am as the new day", () => {
    // 2026-08-07T06:00 in Asia/Jerusalem == 2026-08-07T03:00Z
    expect(todaysEventDate(new Date("2026-08-07T03:00:00Z"))).toBe("2026-08-07");
  });

  it("treats 5:59am as still the previous day", () => {
    // 2026-08-07T05:59 in Asia/Jerusalem == 2026-08-07T02:59Z
    expect(todaysEventDate(new Date("2026-08-07T02:59:00Z"))).toBe("2026-08-06");
  });
});
