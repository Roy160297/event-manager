import chardet from "chardet";
import iconv from "iconv-lite";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  detectedEncoding: string;
}

// Hebrew CSV exports (e.g. from Israeli tools like iPlan) are frequently
// windows-1255 rather than UTF-8; reading them as UTF-8 silently garbles
// the Hebrew text. Detect the real encoding from the raw bytes first.
export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  const detected = chardet.detect(buffer) ?? "UTF-8";
  const encoding = iconv.encodingExists(detected) ? detected : "utf-8";
  const text = iconv.decode(buffer, encoding);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    detectedEncoding: encoding,
  };
}

// Venue guest-list exports (e.g. the fixed template used for seating lists)
// often have a title row above the real headers, e.g. "אורחים" spanning a
// group of columns with the actual field names one row below it. Scan the
// first few rows and use whichever has the most non-empty cells as the
// header row, so both plain single-header sheets and this two-row layout
// parse correctly without a hardcoded row index.
export function parseExcelBuffer(buffer: Buffer): ParsedCsv {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false });

  const countNonEmpty = (row: unknown[]) => row.filter((cell) => String(cell).trim() !== "").length;
  let headerRowIndex = 0;
  let bestCount = -1;
  for (let i = 0; i < Math.min(5, matrix.length); i++) {
    const count = countNonEmpty(matrix[i]);
    if (count > bestCount) {
      bestCount = count;
      headerRowIndex = i;
    }
  }

  const headerRow = matrix[headerRowIndex] ?? [];
  const headers = headerRow.map((cell, index) => {
    const label = String(cell).trim();
    return label || `עמודה ${index + 1}`;
  });

  const rows = matrix.slice(headerRowIndex + 1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? "").trim();
    });
    return record;
  });

  return {
    headers,
    rows,
    detectedEncoding: "Excel",
  };
}
