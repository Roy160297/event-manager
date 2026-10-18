// Each manager's guidelines PDF differs in wording/content - keyed by the
// exact staff name (see lib/labels.ts's MANAGER_LEGEND_COLOR_OVERRIDES for
// the same "רועי פוריאן"/"רן קופרמן" spelling elsewhere in the app). Any
// manager without their own version yet (including רועי פוריאן, whose
// guidelines are the original default) falls back to the plain default file.
const WELCOME_EMAIL_ATTACHMENT_ASSET_BY_MANAGER: Record<string, string> = {
  "ניר חדד": "wedding-welcome-guidelines-nir-hadad.pdf",
  "רן קופרמן": "wedding-welcome-guidelines-ran-kuperman.pdf",
};
const DEFAULT_WELCOME_EMAIL_ATTACHMENT_ASSET = "wedding-welcome-guidelines.pdf";

// Filename under assets/ to read from disk - not the filename shown to the
// couple, which always stays the venue's configured attachment filename regardless of
// which manager's version was actually attached.
export function welcomeEmailAttachmentAssetFor(managerName: string | null): string {
  const trimmed = managerName?.trim();
  return (trimmed && WELCOME_EMAIL_ATTACHMENT_ASSET_BY_MANAGER[trimmed]) ?? DEFAULT_WELCOME_EMAIL_ATTACHMENT_ASSET;
}

// The body is a template the venue edits in its settings: {{manager_name}} is
// the assigned event manager's name (or, if none is assigned yet, whoever is
// sending the email) and {{signature}} that name plus their phone - the couple
// should hear from a real name and number, not a hardcoded signature.
export function buildWelcomeEmailBody(template: string, managerName: string, managerPhone: string | null): string {
  const signature = managerPhone ? `${managerName}, ${managerPhone}` : managerName;
  return template.replaceAll("{{manager_name}}", managerName).replaceAll("{{signature}}", signature);
}
