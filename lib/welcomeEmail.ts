export const WELCOME_EMAIL_SUBJECT = "דף הנחיות לפגישה ראשונית - House No. Seven";

export const WELCOME_EMAIL_ATTACHMENT_FILENAME = "הנחיות והכנות לאירוע - חתונה בשבע.docx";

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

בנוסף - מצורף מטה דף הנחיות עליו נעבור יחד במהלך הפגישה.

בבקשה להשיב במייל חוזר שמות וטלפונים של הספקים, כגון:
דיג'י
צלמים: סטילס וידאו מגנטים
רב / מנחה טקס
מעצב/ת
ועוד...

זמין בשבילכם לכל דבר ומתי שצריך,
${signature}`;
}
