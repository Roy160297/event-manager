import { describe, expect, it } from "vitest";
import {
  assembleReportFields,
  displayValue,
  longFields,
  mergeReportValues,
  reportInputName,
  shortFields,
  type ReportField,
} from "@/lib/reportFields";

const field = (key: string, extra: Partial<ReportField> = {}): ReportField => ({
  key,
  label: key,
  type: "text",
  defaultValue: null,
  showInNotes: false,
  photoSlot: null,
  sortOrder: 0,
  ...extra,
});

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) data.set(name, value);
  return data;
};

describe("assembleReportFields", () => {
  it("orders by sort_order and maps the columns", () => {
    const fields = assembleReportFields([
      { key: "b", label: "B", field_type: "longtext", default_value: null, show_in_notes: true, photo_slot: null, sort_order: 20 },
      { key: "a", label: "A", field_type: "text", default_value: "2", show_in_notes: false, photo_slot: "counter", sort_order: 10 },
    ]);
    expect(fields.map((f) => f.key)).toEqual(["a", "b"]);
    expect(fields[0]).toMatchObject({ type: "text", defaultValue: "2", photoSlot: "counter" });
    expect(fields[1]).toMatchObject({ type: "longtext", showInNotes: true });
  });
});

describe("shortFields / longFields", () => {
  it("splits long texts from the rest, keeping order", () => {
    const fields = [field("a"), field("b", { type: "longtext" }), field("c", { type: "time" }), field("d", { type: "longtext" })];
    expect(shortFields(fields).map((f) => f.key)).toEqual(["a", "c"]);
    expect(longFields(fields).map((f) => f.key)).toEqual(["b", "d"]);
  });
});

describe("mergeReportValues", () => {
  const fields = [field("a"), field("b"), field("floor", { type: "floor_manager" })];

  it("replaces the submitted fields and trims them", () => {
    const merged = mergeReportValues(fields, { a: "old" }, form({ [reportInputName("a")]: "  new ", [reportInputName("b")]: "x" }));
    expect(merged).toEqual({ a: "new", b: "x" });
  });

  it("clears a field that was submitted blank", () => {
    const merged = mergeReportValues(fields, { a: "old", b: "keep" }, form({ [reportInputName("a")]: "   ", [reportInputName("b")]: "keep" }));
    expect(merged).toEqual({ b: "keep" });
  });

  it("leaves untouched what the form did not send, and values of deleted fields", () => {
    const merged = mergeReportValues(fields, { a: "1", removed: "gone-field" }, form({ [reportInputName("b")]: "2" }));
    expect(merged).toEqual({ a: "1", b: "2", removed: "gone-field" });
  });

  it("never stores the derived floor manager field", () => {
    const merged = mergeReportValues(fields, {}, form({ [reportInputName("floor")]: "someone" }));
    expect(merged).toEqual({});
  });
});

describe("displayValue", () => {
  it("shows the saved value, or the event's floor manager for the derived field", () => {
    expect(displayValue(field("a"), { a: " 5 " }, null)).toBe("5");
    expect(displayValue(field("a"), {}, null)).toBeNull();
    expect(displayValue(field("floor", { type: "floor_manager" }), {}, "Dana")).toBe("Dana");
  });
});
