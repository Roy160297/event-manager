import { describe, expect, it } from "vitest";
import { assembleTemplates, pickTemplate, stepsForEvent, type ScheduleTemplate } from "@/lib/scheduleTemplates";

const FRIDAY = "2026-10-16";
const SATURDAY = "2026-10-17";

const template = (id: string, extra: Partial<ScheduleTemplate> = {}): ScheduleTemplate => ({
  id,
  name: id,
  eventTypes: [],
  dayKind: "any",
  referenceTime: null,
  sortOrder: 0,
  steps: [],
  ...extra,
});

describe("assembleTemplates", () => {
  it("orders templates by sort_order and their steps by clock time, after-midnight last", () => {
    const result = assembleTemplates(
      [
        { id: "b", name: "B", event_types: [], day_kind: "any", reference_time: null, sort_order: 20 },
        { id: "a", name: "A", event_types: ["wedding"], day_kind: "friday", reference_time: "12:00", sort_order: 10 },
      ],
      [
        { id: "s1", template_id: "a", label: "late", step_time: "01:00", notes: null },
        { id: "s2", template_id: "a", label: "evening", step_time: "21:00", notes: "note" },
        { id: "s3", template_id: "a", label: "early", step_time: "18:30", notes: null },
        { id: "s4", template_id: "b", label: "other", step_time: "10:00", notes: null },
      ],
    );
    expect(result.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(result[0].steps.map((step) => step.label)).toEqual(["early", "evening", "late"]);
    expect(result[0]).toMatchObject({ eventTypes: ["wedding"], dayKind: "friday", referenceTime: "12:00" });
    expect(result[0].steps[1].notes).toBe("note");
  });
});

describe("pickTemplate", () => {
  const evening = template("evening", { eventTypes: ["reverse_wedding"], dayKind: "not_friday" });
  const friday = template("friday", { eventTypes: ["reverse_wedding"], dayKind: "friday" });
  const any = template("any", { eventTypes: ["wedding"], dayKind: "any" });

  it("chooses by weekday among the templates for the event type", () => {
    expect(pickTemplate([evening, friday], "reverse_wedding", FRIDAY)?.id).toBe("friday");
    expect(pickTemplate([evening, friday], "reverse_wedding", SATURDAY)?.id).toBe("evening");
  });

  it("applies an any-day template on every weekday", () => {
    expect(pickTemplate([any], "wedding", FRIDAY)?.id).toBe("any");
    expect(pickTemplate([any], "wedding", SATURDAY)?.id).toBe("any");
  });

  it("prefers a weekday-specific template over an any-day one", () => {
    const generic = template("generic", { eventTypes: ["reverse_wedding"], dayKind: "any" });
    expect(pickTemplate([generic, friday], "reverse_wedding", FRIDAY)?.id).toBe("friday");
    expect(pickTemplate([generic, friday], "reverse_wedding", SATURDAY)?.id).toBe("generic");
  });

  it("returns null when no template lists the event type", () => {
    expect(pickTemplate([evening, friday, any], "business_event", FRIDAY)).toBeNull();
    expect(pickTemplate([template("manual-only")], "wedding", FRIDAY)).toBeNull();
  });

  it("treats a missing date as not a Friday", () => {
    expect(pickTemplate([evening, friday], "reverse_wedding", null)?.id).toBe("evening");
  });
});

describe("stepsForEvent", () => {
  const steps = [
    { id: "1", label: "arrive", time: "11:00", notes: null },
    { id: "2", label: "reception", time: "12:00", notes: null },
    { id: "3", label: "chuppah", time: "14:00", notes: "n" },
  ];

  it("leaves the steps alone without a reference time", () => {
    expect(stepsForEvent(template("t", { steps }), "11:30")).toEqual(steps);
  });

  it("shifts every step so the reference time lands on the event start", () => {
    const shifted = stepsForEvent(template("t", { steps, referenceTime: "12:00" }), "11:30");
    expect(shifted.map((step) => step.time)).toEqual(["10:30", "11:30", "13:30"]);
    expect(shifted[2].notes).toBe("n");
  });

  it("does not shift when the start matches or is unknown", () => {
    expect(stepsForEvent(template("t", { steps, referenceTime: "12:00" }), "12:00")).toEqual(steps);
    expect(stepsForEvent(template("t", { steps, referenceTime: "12:00" }), null)).toEqual(steps);
  });
});
