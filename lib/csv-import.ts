import chardet from "chardet";
import iconv from "iconv-lite";
import Papa from "papaparse";

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
