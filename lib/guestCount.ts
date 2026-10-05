// "מספר אורחים - התחייבות" is free text, usually "200+14" (guests + reserve).
// Displays that as the total (214); anything that isn't a plain sum of
// numbers (e.g. "כ-300") is shown as typed.
export function totalGuestCount(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const parts = text.split("+").map((part) => part.trim());
  if (parts.every((part) => /^\d+$/.test(part))) {
    return String(parts.reduce((sum, part) => sum + Number(part), 0));
  }
  return text;
}
