import { describe, expect, it } from "vitest";
import { totalGuestCount } from "./guestCount";

describe("totalGuestCount", () => {
  it("adds up a guests+reserve formula", () => {
    expect(totalGuestCount("200+14")).toBe("214");
    expect(totalGuestCount(" 200 + 14 ")).toBe("214");
    expect(totalGuestCount("100+20+5")).toBe("125");
  });

  it("returns a plain number as-is", () => {
    expect(totalGuestCount("300")).toBe("300");
  });

  it("leaves non-numeric text untouched and handles empty values", () => {
    expect(totalGuestCount("כ-300")).toBe("כ-300");
    expect(totalGuestCount("")).toBeNull();
    expect(totalGuestCount(null)).toBeNull();
  });
});
