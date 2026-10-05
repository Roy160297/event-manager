import { describe, expect, it } from "vitest";
import { buildCalendarFeed, calendarFeedToken, isValidCalendarFeedToken, type FeedEvent } from "./calendarFeed";

const base: FeedEvent = {
  id: "abc",
  name: "דנה ויוסי",
  typeLabel: "חתונה",
  date: "2026-10-11",
  startTime: "19:30:00",
  endTime: "01:00:00",
  canceled: false,
  managerName: "רן",
  salesPersonName: null,
  estimatedGuests: "300",
  url: "https://example.com/events/abc",
};

describe("calendarFeedToken", () => {
  it("is stable per secret and validated in constant time", () => {
    const token = calendarFeedToken("secret");
    expect(token).toBe(calendarFeedToken("secret"));
    expect(token).not.toBe(calendarFeedToken("other"));
    expect(isValidCalendarFeedToken(token, "secret")).toBe(true);
    expect(isValidCalendarFeedToken("nope", "secret")).toBe(false);
    expect(isValidCalendarFeedToken(null, "secret")).toBe(false);
  });
});

describe("buildCalendarFeed", () => {
  it("rolls an end time past midnight into the next day", () => {
    const feed = buildCalendarFeed([base], new Date("2026-10-01T00:00:00Z"));
    expect(feed).toContain("DTSTART;TZID=Asia/Jerusalem:20261011T193000");
    expect(feed).toContain("DTEND;TZID=Asia/Jerusalem:20261012T010000");
  });

  it("defaults to a 5 hour duration and emits all-day entries without a start time", () => {
    const noEnd = buildCalendarFeed([{ ...base, endTime: null }]);
    expect(noEnd).toContain("DTEND;TZID=Asia/Jerusalem:20261012T003000");
    const allDay = buildCalendarFeed([{ ...base, startTime: null, endTime: null }]);
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261011");
    expect(allDay).toContain("DTEND;VALUE=DATE:20261012");
  });

  it("marks canceled events and escapes text", () => {
    const feed = buildCalendarFeed([{ ...base, canceled: true, name: "א, ב; ג" }]);
    expect(feed).toContain("STATUS:CANCELLED");
    expect(feed).toContain("SUMMARY:א\\, ב\\; ג (חתונה)");
  });

  it("folds long lines at 75 octets without splitting characters", () => {
    const feed = buildCalendarFeed([{ ...base, name: "ש".repeat(80) }]);
    for (const line of feed.split("\r\n")) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
    expect(feed.replace(/\r\n /g, "")).toContain("ש".repeat(80));
  });

  it("uses CRLF line endings and wraps in VCALENDAR", () => {
    const feed = buildCalendarFeed([]);
    expect(feed.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
