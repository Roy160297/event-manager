import { describe, expect, it } from "vitest";
import { assignManagerColors, formatDateWithWeekday } from "@/lib/labels";

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
    // 8 colors in the palette: the 9th manager wraps to the first color.
    expect(colors.get(sorted[8])).toBe(colors.get(sorted[0]));
    expect(colors.get(sorted[1])).not.toBe(colors.get(sorted[0]));
  });

  it("colors every name it is given, with no names left out or reserved", () => {
    const colors = assignManagerColors(["רועי פוריאן", "שניר", "רן קופרמן", "ירון", "לירן"]);
    expect(colors.size).toBe(5);
  });
});

describe("formatDateWithWeekday", () => {
  it("appends the Hebrew weekday letter (Sunday = א')", () => {
    expect(formatDateWithWeekday("2026-10-11")).toBe("11/10/2026 · יום א'");
    expect(formatDateWithWeekday("2026-10-17")).toBe("17/10/2026 · יום ש'");
  });
  it("handles empty values", () => {
    expect(formatDateWithWeekday(null)).toBe("—");
  });
});
