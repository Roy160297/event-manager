import { describe, expect, it } from "vitest";
import { mapGuestRows } from "@/lib/guestImport";

describe("mapGuestRows", () => {
  it("counts a blank cell in a mapped party_size column as 0, not 1", () => {
    // Regression case: a real import summed to 297 instead of the source
    // file's own 253, because blank cells in a mapped "הושבו בשולחן" column
    // were each defaulting to 1 guest instead of 0.
    const rows = [
      { name: "דנה", "הושבו בשולחן": "2" },
      { name: "רון", "הושבו בשולחן": "" },
      { name: "מיכל", "הושבו בשולחן": "3" },
      { name: "אבי", "הושבו בשולחן": "" },
    ];
    const mapped = mapGuestRows(rows, { name: "name", party_size: "הושבו בשולחן" });
    const total = mapped.reduce((sum, g) => sum + g.party_size, 0);
    expect(total).toBe(5); // 2 + 0 + 3 + 0, not 2 + 1 + 3 + 1
  });

  it("defaults to 1 per row only when there's no party_size column mapped at all", () => {
    const rows = [{ name: "דנה" }, { name: "רון" }];
    const mapped = mapGuestRows(rows, { name: "name" });
    expect(mapped.map((g) => g.party_size)).toEqual([1, 1]);
  });

  it("treats non-numeric junk in a mapped cell as 0, not NaN", () => {
    const rows = [{ name: "דנה", size: "abc" }];
    const mapped = mapGuestRows(rows, { name: "name", party_size: "size" });
    expect(mapped[0].party_size).toBe(0);
  });

  it("filters out rows with a blank name", () => {
    const rows = [{ name: "דנה" }, { name: "" }, { name: "  " }];
    const mapped = mapGuestRows(rows, { name: "name" });
    expect(mapped.map((g) => g.name)).toEqual(["דנה"]);
  });

  it("maps seating_table when provided, null when not mapped", () => {
    const rows = [{ name: "דנה", table: "5" }];
    expect(mapGuestRows(rows, { name: "name", seating_table: "table" })[0].seating_table).toBe("5");
    expect(mapGuestRows(rows, { name: "name" })[0].seating_table).toBeNull();
  });
});
