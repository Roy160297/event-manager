export interface TableSketchTable {
  label: string;
  capacity: number;
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
const OCCUPANCY_PATTERN = /^\d+(?:\+\d+)?\/(\d+)$/;

// iPlan's floor-plan sketch export lists each table as its number on one line
// followed by an occupancy line ("6+2/9" = 6 confirmed + 2 reserved out of 9
// seats, or just "9/9"); we only need the capacity (the number after the
// slash). Anything else that isn't a table number/occupancy pair or a known
// header/footer line is treated as a food station label (e.g. "בשר כפול").
export function parseTableSketchDraft(rawText: string): TableSketchDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

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
        tables.push({ label: line, capacity: Number(occupancyMatch[1]) });
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
