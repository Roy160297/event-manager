import { describe, expect, it } from "vitest";
import {
  CLOSING_CHECKLIST,
  getClosingChecklistForEventType,
  getClosingChecklistKeysForEventType,
} from "@/lib/closingChecklist";

describe("getClosingChecklistForEventType", () => {
  it("includes the business-event category only for business_event", () => {
    const categories = getClosingChecklistForEventType("business_event");
    expect(categories.some((c) => c.key === "business-event-vendors")).toBe(true);
  });

  it("excludes the business-event category for other event types", () => {
    const categories = getClosingChecklistForEventType("wedding");
    expect(categories.some((c) => c.key === "business-event-vendors")).toBe(false);
  });

  it("excludes the business-event category when eventType is null", () => {
    const categories = getClosingChecklistForEventType(null);
    expect(categories.some((c) => c.key === "business-event-vendors")).toBe(false);
  });

  it("always includes every unrestricted category regardless of event type", () => {
    const unrestrictedKeys = CLOSING_CHECKLIST.filter((c) => !c.eventTypes).map((c) => c.key);
    const wedding = getClosingChecklistForEventType("wedding").map((c) => c.key);
    for (const key of unrestrictedKeys) {
      expect(wedding).toContain(key);
    }
  });
});

describe("getClosingChecklistKeysForEventType", () => {
  it("business_event's key set is a superset of wedding's, by exactly the 4 new items", () => {
    const weddingKeys = getClosingChecklistKeysForEventType("wedding");
    const businessKeys = getClosingChecklistKeysForEventType("business_event");
    const extra = [...businessKeys].filter((key) => !weddingKeys.has(key));
    expect(extra.sort()).toEqual(
      [
        "biz-production-vendor-departure-timing",
        "biz-production-rep-stays-until-done",
        "biz-vendor-tasks-review-before-leaving",
        "biz-yard-morning-items",
      ].sort(),
    );
  });
});
