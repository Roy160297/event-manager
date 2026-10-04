import * as XLSX from "xlsx";

export interface RosterWaiter {
  name: string;
  phone: string | null;
  shiftRole: string | null;
  arrival: string | null;
  end: string | null;
}

export function normalizeWaiterName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

// Excel stores a time of day as a fraction of 24h (0.7083 = 17:00); a
// "00:30" finish is 0.0208 and a literal midnight is 0, which the sheet
// uses for "until the end of the night". Text cells pass through as-is.
function formatTimeCell(cell: unknown): string | null {
  if (typeof cell === "number") {
    if (cell < 0 || cell >= 1) return null;
    const totalMinutes = Math.round(cell * 24 * 60) % (24 * 60);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  const text = String(cell ?? "").trim();
  return text || null;
}

const NAME_HEADERS = ["שם מלא", "שם", "שם פרטי", "שם עובד", "שם המלצר"];
const PHONE_HEADERS = ["מס טלפון", "מספר טלפון", "טלפון", "נייד", "טלפון נייד"];
const ROLE_HEADERS = ["תפקיד"];
const ARRIVAL_HEADERS = ["הגעה", "שעת הגעה"];
const END_HEADERS = ["סיום", "שעת סיום"];

// Reads the first sheet of the per-event roster ("מלצרים משובצים" file):
// a header row (somewhere in the first few rows) followed by one row per
// waiter. Repeated names within the file collapse to the first row.
export function parseEventWaiterRoster(buffer: Buffer): RosterWaiter[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("הקובץ ריק");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false });

  const labelOf = (cell: unknown) => String(cell ?? "").trim();
  const headerRowIndex = matrix.slice(0, 10).findIndex((row) => row.some((cell) => NAME_HEADERS.includes(labelOf(cell))));
  if (headerRowIndex === -1) {
    throw new Error('לא זוהתה עמודת "שם" בקובץ — ודאו שיש כותרת עמודה כמו "שם מלא".');
  }

  const headerRow = matrix[headerRowIndex];
  const columnOf = (aliases: string[]) => headerRow.findIndex((cell) => aliases.includes(labelOf(cell)));
  const nameCol = columnOf(NAME_HEADERS);
  const phoneCol = columnOf(PHONE_HEADERS);
  const roleCol = columnOf(ROLE_HEADERS);
  const arrivalCol = columnOf(ARRIVAL_HEADERS);
  const endCol = columnOf(END_HEADERS);

  const seen = new Set<string>();
  const waiters: RosterWaiter[] = [];
  for (const row of matrix.slice(headerRowIndex + 1)) {
    const name = labelOf(row[nameCol]).replace(/\s+/g, " ");
    if (!name) continue;
    const key = normalizeWaiterName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    waiters.push({
      name,
      phone: phoneCol >= 0 ? labelOf(row[phoneCol]) || null : null,
      shiftRole: roleCol >= 0 ? labelOf(row[roleCol]) || null : null,
      arrival: arrivalCol >= 0 ? formatTimeCell(row[arrivalCol]) : null,
      end: endCol >= 0 ? formatTimeCell(row[endCol]) : null,
    });
  }
  return waiters;
}
