export interface GuestColumnMapping {
  name: string;
  party_size?: string;
  seating_table?: string;
}

export interface MappedGuestRow {
  name: string;
  party_size: number;
  seating_table: string | null;
}

// Shared by the real import (app/events/[id]/guests/actions.ts) and the CSV
// preview's total-guest count (GuestCsvImport.tsx) so the preview always
// matches what actually gets imported.
export function mapGuestRows(rows: Record<string, string>[], mapping: GuestColumnMapping): MappedGuestRow[] {
  return rows
    .map((row) => ({
      name: (mapping.name ? row[mapping.name] : "")?.trim() ?? "",
      // A blank/non-numeric cell in a mapped party_size column means "not
      // seated/counted yet" (0), not "assume 1" - only fall back to 1 per
      // row when the file has no such column at all, so every row implicitly
      // represents exactly one person. Defaulting a blank cell to 1 instead
      // of 0 silently inflated real guest-count totals (e.g. 44 blank rows
      // in a real import added 44 phantom guests) past what the source
      // spreadsheet's own sum shows.
      party_size: mapping.party_size ? Number(row[mapping.party_size]) || 0 : 1,
      seating_table: mapping.seating_table ? row[mapping.seating_table]?.trim() || null : null,
    }))
    .filter((guest) => guest.name);
}
