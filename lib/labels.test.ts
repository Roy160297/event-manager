import { describe, expect, it } from "vitest";
import { assignManagerColors } from "@/lib/labels";

describe("assignManagerColors", () => {
  it("gives each manager a distinct color", () => {
    const colors = assignManagerColors(["רועי", "רן"]);
    expect(colors.get("רועי")).toBeTruthy();
    expect(colors.get("רן")).toBeTruthy();
    expect(colors.get("רועי")).not.toBe(colors.get("רן"));
  });

  it("is stable regardless of input order (sorts internally)", () => {
    const a = assignManagerColors(["רועי", "רן"]);
    const b = assignManagerColors(["רן", "רועי"]);
    expect(a.get("רועי")).toBe(b.get("רועי"));
    expect(a.get("רן")).toBe(b.get("רן"));
  });

  it("deduplicates repeated names", () => {
    const colors = assignManagerColors(["רועי", "רועי", "רן"]);
    expect(colors.size).toBe(2);
  });

  it("cycles back through the auto-assigned palette once there are more managers than remaining colors", () => {
    // 2 of the 8 palette colors are permanently reserved for the curated
    // overrides below, so plain auto-assigned names cycle through the
    // remaining 6 - names 9 apart (not 8) land on the same color.
    const names = Array.from({ length: 7 }, (_, i) => `מנהל${i}`);
    const colors = assignManagerColors(names);
    const sorted = [...names].sort((x, y) => x.localeCompare(y, "he"));
    expect(colors.get(sorted[0])).toBe(colors.get(sorted[6]));
  });

  it("gives Roy and Snir their curated (swapped) colors, not auto-assigned ones", () => {
    const colors = assignManagerColors(["רועי פוריאן", "שניר", "רן קופרמן"]);
    expect(colors.get("רועי פוריאן")).toBe("bg-teal-100 text-teal-700");
    expect(colors.get("שניר")).toBe("bg-amber-100 text-amber-700");
  });

  it("excludes לירן and ירון from the legend entirely", () => {
    const colors = assignManagerColors(["ירון", "לירן", "רועי פוריאן", "רן קופרמן", "שניר"]);
    expect(colors.has("ירון")).toBe(false);
    expect(colors.has("לירן")).toBe(false);
    expect(colors.size).toBe(3);
  });

  it("never hands an auto-assigned manager a color reserved by an override", () => {
    const colors = assignManagerColors(["רועי פוריאן", "שניר", "רן קופרמן", "אחר"]);
    const reserved = new Set(["bg-teal-100 text-teal-700", "bg-amber-100 text-amber-700"]);
    expect(reserved.has(colors.get("רן קופרמן")!)).toBe(false);
    expect(reserved.has(colors.get("אחר")!)).toBe(false);
  });
});
