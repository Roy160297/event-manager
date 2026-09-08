export interface TableSketchTable {
  label: string;
  capacity: number;
  // Confirmed + reserved guests actually assigned a seat at this table
  // ("6+2/9" -> 8), as opposed to `capacity` (the table's total seat count,
  // the "9"). Used to total up how many chairs were seated venue-wide.
  seated: number;
}

export interface TableSketchFoodStand {
  label: string;
}

export interface TableSketchDraft {
  tables: TableSketchTable[];
  foodStands: TableSketchFoodStand[];
  warnings: string[];
}

const TABLE_NUMBER_PATTERN = /^\d{1,3}$/;
const OCCUPANCY_PATTERN = /^(\d+)(?:\+(\d+))?\/(\d+)$/;

// When two tables sit close together in the sketch's layout, pdf-parse's
// text extraction occasionally merges the tail end of one table's line with
// the start of the next onto a single physical line (e.g. table 20's "9/9"
// glued to table 21's "21" as "9/9 21") - purely a PDF-layout artifact, not
// a real difference in the data. Left alone, the pair-walking loop below
// can't match either half against its neighbor, so both tables silently
// drop out of the count entirely (confirmed against a real sketch: exactly
// this merge accounted for the whole gap between the app's total and a
// manual recount). Un-merge any line that is nothing but whitespace-joined
// table-number/occupancy tokens back into separate lines before the main
// loop runs, so it never has to know this happened.
function splitMergedLine(line: string): string[] {
  const parts = line.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => TABLE_NUMBER_PATTERN.test(p) || OCCUPANCY_PATTERN.test(p))) {
    return parts;
  }
  return [line];
}

// iPlan's floor-plan sketch export lists each table as its number on one line
// followed by an occupancy line ("6+2/9" = 6 confirmed + 2 reserved out of 9
// seats, or just "9/9"); we only need the capacity (the number after the
// slash). Anything else that isn't a table number/occupancy pair or a known
// header/footer line is treated as a food station label (e.g. "בשר כפול").
export function parseTableSketchDraft(rawText: string): TableSketchDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .flatMap(splitMergedLine);

  const isSkipLine = (line: string) =>
    line.includes("תאריך האירוע") ||
    line.startsWith("(") ||
    line.includes("iPlan") ||
    line.includes("כל הזכויות") ||
    /^--.*--$/.test(line) ||
    line === "רחבת ריקודים";

  const tables: TableSketchTable[] = [];
  const foodStands: TableSketchFoodStand[] = [];
  const warnings: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isSkipLine(line)) {
      i += 1;
      continue;
    }

    if (TABLE_NUMBER_PATTERN.test(line)) {
      const next = lines[i + 1] ?? "";
      const occupancyMatch = next.match(OCCUPANCY_PATTERN);
      if (occupancyMatch) {
        const seated = Number(occupancyMatch[1]) + Number(occupancyMatch[2] ?? 0);
        tables.push({ label: line, capacity: Number(occupancyMatch[3]), seated });
        i += 2;
        continue;
      }
      warnings.push(`מספר שולחן "${line}" ללא נתוני תפוסה תואמים - נדרשת בדיקה ידנית`);
      i += 1;
      continue;
    }

    if (OCCUPANCY_PATTERN.test(line)) {
      warnings.push(`נמצאו נתוני תפוסה "${line}" ללא מספר שולחן משויך`);
      i += 1;
      continue;
    }

    const stationNames = line
      .split(/\t+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of stationNames) {
      foodStands.push({ label: name });
    }
    i += 1;
  }

  if (tables.length === 0 && foodStands.length === 0) {
    warnings.push("לא זוהו שולחנות או עמדות אוכל בקובץ - בדקו שזהו קובץ סקיצה תקין מ-iPlan");
  }

  return { tables, foodStands, warnings };
}
