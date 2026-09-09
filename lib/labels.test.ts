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

  it("cycles back through the palette once there are more managers than colors", () => {
    const names = Array.from({ length: 9 }, (_, i) => `מנהל${i}`);
    const colors = assignManagerColors(names);
    const sorted = [...names].sort((x, y) => x.localeCompare(y, "he"));
    expect(colors.get(sorted[0])).toBe(colors.get(sorted[8]));
  });
});
