import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { normalizeWaiterName, parseEventWaiterRoster } from "./eventWaiterImport";

function workbookBuffer(rows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "גיליון1");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("parseEventWaiterRoster", () => {
  it("reads name, phone, role and converts time fractions to HH:MM", () => {
    const buffer = workbookBuffer([
      ["", "שם מלא", "מס טלפון", "תפקיד", "הגעה", "סיום"],
      [1, "מילנה ניכנזון ", "052-559-1280", "משפחה", 0.7083333333333334, 0.9583333333333334],
      [2, "אושר יצחק", "053-448-0719", "מקוצרת", 0.7708333333333334, 0],
      [3, "נטע בשן", "052-566-8683", "בריסטה", 0.84375, ""],
    ]);
    expect(parseEventWaiterRoster(buffer)).toEqual([
      { name: "מילנה ניכנזון", phone: "052-559-1280", shiftRole: "משפחה", arrival: "17:00", end: "23:00" },
      { name: "אושר יצחק", phone: "053-448-0719", shiftRole: "מקוצרת", arrival: "18:30", end: "00:00" },
      { name: "נטע בשן", phone: "052-566-8683", shiftRole: "בריסטה", arrival: "20:15", end: null },
    ]);
  });

  it("skips blank rows and repeated names", () => {
    const buffer = workbookBuffer([
      ["שם מלא"],
      ["דנה כהן"],
      [""],
      ["דנה  כהן "],
    ]);
    expect(parseEventWaiterRoster(buffer).map((w) => w.name)).toEqual(["דנה כהן"]);
  });

  it("rejects a file without a name column", () => {
    expect(() => parseEventWaiterRoster(workbookBuffer([["a", "b"], [1, 2]]))).toThrow("שם");
  });
});

describe("normalizeWaiterName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeWaiterName("  אראל   אדם ")).toBe("אראל אדם");
  });
});
