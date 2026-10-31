import { describe, expect, it } from "vitest";
import { SUMMARY_REPORT_ANCHOR, eventEntryHref } from "@/lib/eventEntry";

describe("eventEntryHref", () => {
  it("opens today's event on its summary report", () => {
    expect(eventEntryHref("e1", true, true)).toBe(`/events/e1/tasks?report=1#${SUMMARY_REPORT_ANCHOR}`);
  });

  it("opens the overview on any other day", () => {
    expect(eventEntryHref("e1", false, true)).toBe("/events/e1");
  });

  it("opens the overview for someone who may not read the report", () => {
    expect(eventEntryHref("e1", true, false)).toBe("/events/e1");
  });
});
