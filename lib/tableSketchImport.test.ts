import { describe, expect, it } from "vitest";
import { parseTableSketchDraft } from "@/lib/tableSketchImport";

describe("parseTableSketchDraft", () => {
  it("splits confirmed+reserve from capacity ('6+2/9' -> seated 8, capacity 9)", () => {
    const draft = parseTableSketchDraft("12\n6+2/9");
    expect(draft.tables).toEqual([{ label: "12", capacity: 9, seated: 8 }]);
  });

  it("treats a plain 'X/Y' line as fully seated (no reserve component)", () => {
    const draft = parseTableSketchDraft("3\n9/9");
    expect(draft.tables).toEqual([{ label: "3", capacity: 9, seated: 9 }]);
  });

  it("sums seated and capacity correctly across multiple tables", () => {
    const draft = parseTableSketchDraft("1\n6+2/9\n2\n9/9\n3\n4+0/10");
    const totalSeated = draft.tables.reduce((sum, t) => sum + t.seated, 0);
    const totalCapacity = draft.tables.reduce((sum, t) => sum + t.capacity, 0);
    expect(totalSeated).toBe(8 + 9 + 4);
    expect(totalCapacity).toBe(9 + 9 + 10);
  });

  it("still collects food-stand labels alongside tables", () => {
    const draft = parseTableSketchDraft("1\n6+2/9\nבשר כפול");
    expect(draft.foodStands).toEqual([{ label: "בשר כפול" }]);
  });

  it("keeps a table number that has no occupancy line (empty table) with capacity 0 and a warning", () => {
    const draft = parseTableSketchDraft("5\nבשר כפול\n6\n7");
    expect(draft.tables).toEqual([
      { label: "5", capacity: 0, seated: 0 },
      { label: "6", capacity: 0, seated: 0 },
      { label: "7", capacity: 0, seated: 0 },
    ]);
    expect(draft.foodStands).toEqual([{ label: "בשר כפול" }]);
    expect(draft.warnings).toHaveLength(1);
    expect(draft.warnings[0]).toContain("5, 6, 7");
  });

  it("reads a starred table number ('*19') as table 19, not a food stand", () => {
    const draft = parseTableSketchDraft("רחבת ריקודים\n18\n9/9\n*19\n9/9");
    expect(draft.tables).toEqual([
      { label: "18", capacity: 9, seated: 9 },
      { label: "19", capacity: 9, seated: 9 },
    ]);
    expect(draft.foodStands).toEqual([]);
    expect(draft.warnings).toEqual([]);
  });

  it("numbers repeated station names so each stand is its own row", () => {
    const draft = parseTableSketchDraft("בשר כפול\nדג\tדג\tעוף\nעוף");
    expect(draft.foodStands.map((s) => s.label)).toEqual(["בשר כפול", "דג", "דג (2)", "עוף", "עוף (2)"]);
  });

  it("ignores stray punctuation and single letters left by wrapped labels", () => {
    const draft = parseTableSketchDraft("וילון\n-\nה");
    expect(draft.foodStands).toEqual([{ label: "וילון" }]);
  });

  it("warns instead of crashing on an orphaned occupancy line", () => {
    const draft = parseTableSketchDraft("6+2/9");
    expect(draft.tables).toEqual([]);
    expect(draft.warnings.some((w) => w.includes("6+2/9"))).toBe(true);
  });

  it("recovers two tables whose lines got merged by the PDF layout ('9/9 21' = table 20's occupancy glued to table 21's number)", () => {
    const draft = parseTableSketchDraft("19\n9/9\n20\n9/9 21\n18/18\n22\n17/18");
    expect(draft.tables).toEqual([
      { label: "19", capacity: 9, seated: 9 },
      { label: "20", capacity: 9, seated: 9 },
      { label: "21", capacity: 18, seated: 18 },
      { label: "22", capacity: 18, seated: 17 },
    ]);
    expect(draft.warnings).toEqual([]);
  });

  it("leaves a real multi-word food-stand label (e.g. tab-separated names) unsplit", () => {
    const draft = parseTableSketchDraft("1\n6+2/9\nבשר כפול\tדגים");
    expect(draft.foodStands).toEqual([{ label: "בשר כפול" }, { label: "דגים" }]);
  });

  it("warns when nothing at all is recognized", () => {
    const draft = parseTableSketchDraft("(some header)\niPlan export");
    expect(draft.tables).toEqual([]);
    expect(draft.foodStands).toEqual([]);
    expect(draft.warnings).toEqual(["לא זוהו שולחנות או עמדות אוכל בקובץ - בדקו שזהו קובץ סקיצה תקין מ-iPlan"]);
  });
});
