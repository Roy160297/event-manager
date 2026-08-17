// Converts a locally-stored Israeli phone number (e.g. "052-123-4567") into
// the digits-only, country-code-prefixed form wa.me click-to-chat links
// require (e.g. "972521234567"). Already-international numbers pass through
// unchanged (just stripped of formatting).
export function toWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}
