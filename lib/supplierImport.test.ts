import { describe, expect, it } from "vitest";
import { normalizeIsraeliPhone } from "./supplierImport";

describe("normalizeIsraeliPhone", () => {
  it("converts a +972 number to the local 0 prefix", () => {
    expect(normalizeIsraeliPhone("+972521234567")).toBe("0521234567");
  });

  it("handles +972 with spaces/dashes", () => {
    expect(normalizeIsraeliPhone("+972 52-123-4567")).toBe("0521234567");
  });

  it("handles a bare 972 prefix with no plus sign", () => {
    expect(normalizeIsraeliPhone("972521234567")).toBe("0521234567");
  });

  it("leaves an already-local number unchanged", () => {
    expect(normalizeIsraeliPhone("0521234567")).toBe("0521234567");
  });

  it("leaves a non-Israeli number unchanged", () => {
    expect(normalizeIsraeliPhone("+1 555-123-4567")).toBe("+1 555-123-4567");
  });
});
