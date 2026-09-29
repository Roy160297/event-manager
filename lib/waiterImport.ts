export interface WaiterColumnMapping {
  name: string;
  phone?: string;
}

export interface MappedWaiterRow {
  name: string;
  phone: string | null;
}

// Mirrors lib/guestImport.ts's mapGuestRows - shared by the real import
// (app/waiters/actions.ts) and the file preview (WaitersImportWizard.tsx) so
// the preview always matches what actually gets imported.
export function mapWaiterRows(rows: Record<string, string>[], mapping: WaiterColumnMapping): MappedWaiterRow[] {
  return rows
    .map((row) => ({
      name: (mapping.name ? row[mapping.name] : "")?.trim() ?? "",
      phone: mapping.phone ? row[mapping.phone]?.trim() || null : null,
    }))
    .filter((waiter) => waiter.name);
}
