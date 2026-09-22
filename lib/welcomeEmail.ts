export const WELCOME_EMAIL_SUBJECT = "דף הנחיות לפגישה ראשונית - House No. Seven";

export const WELCOME_EMAIL_ATTACHMENT_FILENAME = "הנחיות והכנות לאירוע - חתונה בשבע.pdf";

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
// couple, which always stays WELCOME_EMAIL_ATTACHMENT_FILENAME regardless of
// which manager's version was actually attached.
export function welcomeEmailAttachmentAssetFor(managerName: string | null): string {
  const trimmed = managerName?.trim();
  return (trimmed && WELCOME_EMAIL_ATTACHMENT_ASSET_BY_MANAGER[trimmed]) ?? DEFAULT_WELCOME_EMAIL_ATTACHMENT_ASSET;
}

// managerName/managerPhone are the assigned event manager's own details (or,
// if no manager is assigned yet, whoever is sending the email) - the couple
// should hear from a real name and number, not a hardcoded signature.
export function buildWelcomeEmailBody(managerName: string, managerPhone: string | null): string {
  const signature = managerPhone ? `${managerName}, ${managerPhone}` : managerName;
  return `אהלן זוג יקר
נעים מאוד, ${managerName} 😊
איזה כיף שהגענו לחלק הזה 🥳

לנוחיותכם להמשך הדרך, רשימת בעלי התפקידים באירוע שלכם:

אנוכי - מנהל האירוע שלכם מטעם האולם. אני אלווה אתכם מעתה ועד לסוף האירוע, כולל וכמובן בזמן האירוע עצמו.
מלצרית משפחה - תהיה לשירותכם לאורך האירוע
שניר - מנהל תפעול יום והקמת האירוע
דותן - שף האולם
צוות קייטרינג לפי יחס של 1:10
מנהל מלצרים מטעם הקייטרינג
צוות בר לפי יחס של 1:50 כולל מנהל בר

בנוסף - מצורף מטה דף הנחיות עליו עברנו יחד בפגישה.

בבקשה להשיב במייל חוזר (אם לא סיפקתם לי את המידע הזה בפגישה או אחריה) שמות וטלפונים של הספקים, כגון:
דיג'י
צלמים: סטילס וידאו מגנטים
רב / מנחה טקס
מעצב/ת
ועוד...

זמין בשבילכם לכל דבר ומתי שצריך,
${signature}`;
}
