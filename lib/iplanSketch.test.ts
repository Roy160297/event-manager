import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelBuffer } from "@/lib/csv-import";
import { guessGuestMapping, mapGuestRows } from "@/lib/guestImport";
import { parseSketchHtml, renderSketchSvg, seatedTotal, sketchDraft, sketchSummary } from "@/lib/iplanSketch";

// Shapes as they appear in iPlan's sketch print page: JSON inside an attribute,
// quotes written as &quot;.
function shapeAttr(model: Record<string, unknown>): string {
  return `<g class="sketch_shape" data-init_model="${JSON.stringify(model).replace(/"/g, "&quot;")}"></g>`;
}

const html = [
  shapeAttr({ x: 2048.05, y: 2591.89, rotate_angle: 0, height: 900, width: 730, seatable: false, shape_text: "רחבת ריקודים", z_index: 15, id: "1", name: "רחבת ריקודים" }),
  shapeAttr({ x: 4832.96, y: 5444.03, rotate_angle: 0, height: 360, width: 289, seatable: false, shape_text: "", z_index: 21, id: "2", name: "חופה" }),
  shapeAttr({ x: 2177.21, y: 1906.83, rotate_angle: 0, height: 90, width: 420, seatable: false, shape_text: "בשר כפול", z_index: 123, id: "3", name: "מזנון מטבח פתוח 420/90" }),
  shapeAttr({ x: 2829.71, y: 1892.72, rotate_angle: 0, height: 90, width: 300, seatable: false, shape_text: "סלטים", z_index: 143, id: "4", name: "מזנון מטבח פתוח 300/90" }),
  shapeAttr({ x: 2310.05, y: 3513.16, rotate_angle: 0, height: 206, width: 206, seatable: false, shape_text: "", z_index: 131, id: "5", name: "עמדת DJ" }),
  shapeAttr({
    x: 3302.43, y: 3339.5, rotate_angle: 180, height: 210, width: 210, seatable: true, shape_text: "", z_index: 39, id: "6",
    name: "שולחן עגול מפה - 9 כסאות", dimensions_without_chairs: false,
    table: { id: 1, num: 15, optioned: false, seats_count: 9, seated_total_guests_count: 7, seated_optioned_guests_count: 2 },
  }),
  shapeAttr({
    x: 1026.32, y: 2541.06, rotate_angle: 0, height: 170, width: 391, seatable: true, shape_text: "", z_index: 136, id: "7",
    name: "שולחן הושבה 16", dimensions_without_chairs: true, width_without_chairs: 390, height_without_chairs: 90,
    table: { id: 2, num: 2, optioned: false, seats_count: 18, seated_total_guests_count: 0, seated_optioned_guests_count: 0 },
  }),
  // a second stand with the same caption must not be listed twice
  shapeAttr({ x: 10, y: 10, rotate_angle: 0, height: 90, width: 300, seatable: false, shape_text: "סלטים", z_index: 144, id: "8", name: "מזנון מטבח פתוח 300/90" }),
].join("\n");

describe("parseSketchHtml", () => {
  it("reads every shape, including tables with their seat counts", () => {
    const sketch = parseSketchHtml(html);
    expect(sketch.shapes).toHaveLength(8);
    const table = sketch.shapes.find((shape) => shape.id === "6");
    expect(table).toMatchObject({ seatable: true, rotate_angle: 180, table: { num: 15, seats_count: 9, seated_total_guests_count: 7 } });
    expect(sketch.shapes.find((shape) => shape.id === "7")).toMatchObject({ width_without_chairs: 390, height_without_chairs: 90 });
  });

  it("ignores a broken attribute and a page without a sketch", () => {
    expect(parseSketchHtml('<g data-init_model="{not json"></g>').shapes).toEqual([]);
    expect(parseSketchHtml("<html></html>").shapes).toEqual([]);
  });
});

describe("sketchDraft", () => {
  const draft = sketchDraft(parseSketchHtml(html));

  it("lists the tables in numeric order with capacity and seated guests", () => {
    expect(draft.tables).toEqual([
      { label: "2", capacity: 18, seated: 0 },
      { label: "15", capacity: 9, seated: 7 },
    ]);
  });

  it("treats captioned shapes as food stands, once each, and leaves out the dance floor", () => {
    expect(draft.foodStands).toEqual([{ label: "בשר כפול" }, { label: "סלטים" }]);
  });

  it("totals the seated chairs and summarises the hall", () => {
    expect(seatedTotal(draft)).toBe(7);
    expect(sketchSummary(draft)).toBe("2 שולחנות (27 מקומות), 2 עמדות אוכל");
  });
});

describe("renderSketchSvg", () => {
  it("draws every shape with table numbers and food stand names", () => {
    const svg = renderSketchSvg(parseSketchHtml(html));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(">15</text>");
    expect(svg).toContain(">בשר כפול</text>");
    expect(svg).toContain(">DJ</text>");
    expect(svg).toContain("rotate(180");
  });

  it("still produces a valid drawing for an empty sketch", () => {
    expect(renderSketchSvg({ shapes: [] })).toContain("viewBox");
  });
});

describe("the invitations file", () => {
  // The layout of iPlan's invitations.xls: a title row above the real headers.
  const sheet = XLSX.utils.aoa_to_sheet([
    ["הזמנה עבור", "קבוצה וצד", "", "אורחים", "", "", ""],
    ["שם פרטי+שם משפחה", "צד", "קבוצה", "שולחן", "הושבו בשולחן", "הגיעו בפועל", ""],
    ["אביעד עקיבא", "חתן וכלה", "יובל - מילואים", "", 1, "", ""],
    ["אודי אחישר", "חתן וכלה", "משפחה גילה", "12", 2, "", ""],
    ["אודי חסדאי", "חתן וכלה", "מיקה", "", "", "", ""],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "הזמנות");
  const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xls" }));

  it("maps to the same columns the manual guest import uses", () => {
    const parsed = parseExcelBuffer(buffer);
    const mapping = guessGuestMapping(parsed.headers);
    expect(mapping).toEqual({ name: "שם פרטי+שם משפחה", party_size: "הושבו בשולחן", seating_table: "שולחן" });
    expect(mapGuestRows(parsed.rows, mapping as { name: string; party_size: string; seating_table: string })).toEqual([
      { name: "אביעד עקיבא", party_size: 1, seating_table: null },
      { name: "אודי אחישר", party_size: 2, seating_table: "12" },
      { name: "אודי חסדאי", party_size: 0, seating_table: null },
    ]);
  });
});
