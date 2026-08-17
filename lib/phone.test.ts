import { describe, expect, it } from "vitest";
import { toWhatsAppDigits } from "./phone";

describe("toWhatsAppDigits", () => {
  it("converts a local 0-prefixed number to a 972-prefixed one", () => {
    expect(toWhatsAppDigits("0521234567")).toBe("972521234567");
  });

  it("strips formatting characters", () => {
    expect(toWhatsAppDigits("052-123-4567")).toBe("972521234567");
  });

  it("passes an already-international number through unchanged", () => {
    expect(toWhatsAppDigits("+972521234567")).toBe("972521234567");
  });

  it("returns null for an empty string", () => {
    expect(toWhatsAppDigits("")).toBeNull();
  });
});
