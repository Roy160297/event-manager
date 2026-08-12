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

  it("warns instead of crashing on a table number with no matching occupancy line", () => {
    const draft = parseTableSketchDraft("5\nבשר כפול");
    expect(draft.tables).toEqual([]);
    expect(draft.warnings.some((w) => w.includes('"5"'))).toBe(true);
  });

  it("warns instead of crashing on an orphaned occupancy line", () => {
    const draft = parseTableSketchDraft("6+2/9");
    expect(draft.tables).toEqual([]);
    expect(draft.warnings.some((w) => w.includes("6+2/9"))).toBe(true);
  });

  it("warns when nothing at all is recognized", () => {
    const draft = parseTableSketchDraft("(some header)\niPlan export");
    expect(draft.tables).toEqual([]);
    expect(draft.foodStands).toEqual([]);
    expect(draft.warnings).toEqual(["לא זוהו שולחנות או עמדות אוכל בקובץ - בדקו שזהו קובץ סקיצה תקין מ-iPlan"]);
  });
});
