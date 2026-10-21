import { describe, expect, it } from "vitest";
import {
  FALLBACK_EVENT_TYPES,
  assembleEventTypes,
  eventTypeLabel,
  isBusinessType,
  labelsOf,
  resolveEventType,
} from "@/lib/eventTypes";

const types = assembleEventTypes([
  { key: "b", label: "B", is_business: true, sort_order: 20 },
  { key: "a", label: "A", is_business: false, sort_order: 10 },
]);

describe("assembleEventTypes", () => {
  it("orders by sort_order and maps the columns", () => {
    expect(types.map((type) => type.key)).toEqual(["a", "b"]);
    expect(types[1]).toMatchObject({ label: "B", isBusiness: true });
  });
});

describe("labels and flags", () => {
  it("builds a key -> label map", () => {
    expect(labelsOf(types)).toEqual({ a: "A", b: "B" });
  });

  it("shows an unknown key as itself and no type as a dash", () => {
    const labels = labelsOf(types);
    expect(eventTypeLabel(labels, "a")).toBe("A");
    expect(eventTypeLabel(labels, "removed")).toBe("removed");
    expect(eventTypeLabel(labels, null)).toBe("—");
  });

  it("knows which types are business events", () => {
    expect(isBusinessType(types, "b")).toBe(true);
    expect(isBusinessType(types, "a")).toBe(false);
    expect(isBusinessType(types, "removed")).toBe(false);
    expect(isBusinessType(types, null)).toBe(false);
  });
});

describe("resolveEventType", () => {
  it("keeps a key the venue has", () => {
    expect(resolveEventType(types, "b")).toBe("b");
  });

  it("falls back to 'other' when the venue has it, else to the first type", () => {
    expect(resolveEventType(FALLBACK_EVENT_TYPES, "not-a-type")).toBe("other");
    expect(resolveEventType(types, "not-a-type")).toBe("a");
    expect(resolveEventType(types, null)).toBe("a");
  });
});
