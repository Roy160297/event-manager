import { GoogleGenAI, Type } from "@google/genai";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { isFriday, fridayEndTime } from "@/lib/scheduleTime";
import type { EventType } from "@/lib/types";

export interface ImageImportDraft {
  name: string;
  bride_name: string | null;
  groom_name: string | null;
  event_type: EventType;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_manager_name: string | null;
  sales_person_name: string | null;
  service_style: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  estimated_guests: string | null;
  kids_meal_count: string | null;
  glat_meal_count: string | null;
  vegetarian_meal_count: string | null;
  vegan_meal_count: string | null;
  gluten_free_meal_count: string | null;
  toddlers_under_2_count: string | null;
  menu_notes: string | null;
  // Which screenshot format this was extracted from - callers that carry
  // forward a previous reserve percentage (see applyCarriedReservePercent)
  // only do so for "commitment_email", since that format never shows reserve
  // data at all (unlike "iplan_screen", where a missing reserve genuinely
  // means none was visible this time).
  source_type: "iplan_screen" | "commitment_email";
  warnings: string[];
}

const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export interface GeminiExtraction {
  bride_name: string | null;
  groom_name: string | null;
  event_type: EventType;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_manager_name: string | null;
  sales_person_name: string | null;
  service_style: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  guests_secure: number | null;
  guests_reserve: number | null;
  guests_reserve_percent: number | null;
  kids_meals: number | null;
  glat_meals: number | null;
  vegetarian_meals: number | null;
  vegan_meals: number | null;
  gluten_free_meals: number | null;
  toddlers_under_2: number | null;
  source_type: "iplan_screen" | "commitment_email";
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    source_type: {
      type: Type.STRING,
      enum: ["iplan_screen", "commitment_email"],
      description:
        'iplan_screen = צילום מסך של עמוד אירוע ממסך "ענן" במערכת iPlan (עמוס בתיבות מידע קטנות רבות זו לצד זו). commitment_email = צילום מסך של מייל (למשל מ-Outlook) שכותרתו "התחייבות סופית - ..." ותוכנו מדווח על עדכון בכמות אורחים.',
    },
    bride_name: {
      type: Type.STRING,
      nullable: true,
      description:
        'שם הכלה בלבד, בעברית בלבד (גם אם מופיע באנגלית באזור "משתמשים באירוע" - השתמש בגרסה העברית מכותרת העמוד). אם שני הצדדים מתויגים "חתן" (זוג חתנים) - השאר null כאן ושים את שני השמות בשדה groom_name.',
    },
    groom_name: {
      type: Type.STRING,
      nullable: true,
      description:
        'שם החתן בלבד, בעברית בלבד (גם אם מופיע באנגלית באזור "משתמשים באירוע" - השתמש בגרסה העברית מכותרת העמוד). אם שני הצדדים מתויגים "חתן" (זוג חתנים) - שים כאן את שני השמות יחד (למשל "שם1 ושם2"). אם שני הצדדים מתויגים "כלה" (זוג כלות) - שים את שני השמות יחד בשדה bride_name במקום, והשאר שדה זה null.',
    },
    event_type: {
      type: Type.STRING,
      enum: EVENT_TYPE_KEYS,
      description: Object.entries(EVENT_TYPE_LABELS)
        .map(([key, label]) => `${key} = ${label}`)
        .join(", "),
    },
    event_date: { type: Type.STRING, nullable: true, description: "תאריך האירוע בפורמט YYYY-MM-DD" },
    start_time: { type: Type.STRING, nullable: true, description: "שעת התחלה בפורמט HH:MM" },
    end_time: { type: Type.STRING, nullable: true, description: "שעת סיום בפורמט HH:MM" },
    event_manager_name: { type: Type.STRING, nullable: true, description: 'שם "מנהל אירוע", אם מופיע' },
    sales_person_name: {
      type: Type.STRING,
      nullable: true,
      description:
        'שם איש/ת "מכירות". אם יש שדה מפורש בשם "איש/ת מכירות" (או דומה) - השתמש בו. אחרת, בכרטיס "פרטי אירוע" חפש את השדה "נוצר ע"י:" והשתמש בשם המופיע שם - זהו איש/ת המכירות שיצר/ה את האירוע.',
    },
    service_style: { type: Type.STRING, nullable: true, description: 'הטקסט הגולמי של שדה "סוג הגשה"' },
    contact_phone: { type: Type.STRING, nullable: true, description: "טלפון איש הקשר הראשון (למשל החתן)" },
    contact_phone_2: { type: Type.STRING, nullable: true, description: "טלפון איש הקשר השני (למשל הכלה)" },
    contact_email: { type: Type.STRING, nullable: true, description: "אימייל איש הקשר הראשון" },
    contact_email_2: { type: Type.STRING, nullable: true, description: "אימייל איש הקשר השני" },
    guests_secure: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "אורחים בטוחים", או משדה "מינימום אורחים" אם זה השם המופיע במקום זאת - אותו שדה בשני שמות אפשריים. commitment_email: המספר הכולל הסופי שליד "העלו כמות ל" (או ניסוח דומה) ולידו "מבוגרים" - אינו כולל רזרבה.',
    },
    guests_reserve: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen בלבד: המספר הגולמי משדה "אורחים רזרבה", רק אם הוא מוצג כמספר אורחים ולא כאחוז. ב-commitment_email תמיד null - מייל זה אינו מציג נתוני רזרבה בכלל.',
    },
    guests_reserve_percent: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen בלבד: האחוז הגולמי משדה הרזרבה (לדוגמה "% רזרבה מקסימלי"), רק אם הוא מוצג כאחוז ולא כמספר אורחים. ב-commitment_email תמיד null.',
    },
    kids_meals: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "מנות ילדים". commitment_email: המספר שב"בנוסף" ליד "מנות ילדים"/"ילדים", או חלק ה"מעל" אם יש פיצול "מעל"/"תינוק".',
    },
    glat_meals: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "מנות גלאט". commitment_email: המספר שב"מתוכם" ליד "גלאט" (כבר נכלל בתוך guests_secure, לא מתווסף עליו).',
    },
    vegetarian_meals: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "מנות צמחוניות". commitment_email: המספר שב"מתוכם" ליד "צמחוני" (כבר נכלל בתוך guests_secure, לא מתווסף עליו).',
    },
    vegan_meals: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "מנות טבעוניות". commitment_email: המספר שב"מתוכם" ליד "טבעוני" (כבר נכלל בתוך guests_secure, לא מתווסף עליו).',
    },
    gluten_free_meals: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "מנות ללא גלוטן". commitment_email: המספר שב"מתוכם" ליד "ללא גלוטן" (כבר נכלל בתוך guests_secure, לא מתווסף עליו).',
    },
    toddlers_under_2: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'iplan_screen: המספר משדה "ילדים מתחת לגיל 2". commitment_email: חלק ה"תינוק" אם יש פיצול "מעל"/"תינוק" ב"בנוסף".',
    },
  },
  required: ["event_type", "source_type"],
};

const PROMPT = `זהו צילום מסך שעשוי להיות אחד משני סוגים שונים. קבע קודם כל איזה מהם זה (שדה source_type), ולאחר מכן חלץ את שאר הנתונים בהתאם לסוג שזוהה. החזר JSON בלבד לפי הסכמה שסופקה.

סוג 1 - "iplan_screen": צילום מסך של עמוד אירוע ממסך "ענן" במערכת iPlan - עמוס בתיבות מידע קטנות רבות זו לצד זו.
סוג 2 - "commitment_email": צילום מסך של מייל (למשל מ-Outlook) שכותרתו "התחייבות סופית - ..." ותוכנו מדווח על עדכון בכמות אורחים.

הנחיות חשובות:
- אם שדה אינו מופיע בבירור בתמונה, החזר null עבורו - לעולם אל תמציא ערך.
--- הנחיות לסוג "iplan_screen" ---
- שם הזוג מופיע בכותרת הראשית של העמוד (למשל "יובל ורדי ואיילון אלקיים") ולעיתים גם באזור "משתמשים באירוע" או ברשימת "הזמנות להצטרף לאירוע", שם כל איש קשר מתויג בסוגריים (חתן)/(כלה). ייתכן זוג מאותו מין - שני הצדדים מתויגים "חתן" (זוג חתנים) או ששניהם מתויגים "כלה" (זוג כלות). במקרה כזה אל תכריח התאמה של חתן אחד וכלה אחת - חלץ את שני השמות יחד לפי ההנחיות בשדות bride_name/groom_name.
- שמות בני הזוג (וכל שם אחר שאתה מחלץ) חייבים להיות בעברית בלבד, לעולם לא באנגלית/אותיות לועזיות. אם שם מופיע באנגלית באזור "משתמשים באירוע" (למשל שם משתמש), בעוד שאותו אדם מופיע בעברית בכותרת הראשית של העמוד - יש להשתמש תמיד בגרסה העברית מהכותרת ולהתעלם לחלוטין מהגרסה האנגלית.
- תאריך, שעת התחלה ושעת סיום מופיעים בתיבות הכחולות בפינה השמאלית העליונה של העמוד. לעיתים התאריך מופיע בתוך אותה תיבה יחד עם שם היום בשבוע (למשל "יום ג' 11/08/2026") - במקרה כזה התעלם משם היום וחלץ רק את החלק המספרי של התאריך. אל תחזיר null עבור event_date אם יש בתיבה כלשהי רצף מספרים בפורמט תאריך (DD/MM/YYYY) - זהו כמעט תמיד תאריך האירוע.
- שדה "event_type" חייב להיות אחד מהערכים המותרים בסכמה בלבד. קבע אותו לפי תווית סוג האירוע המוצגת (למשל "חתונה"). אם מופיע גם פירוט "סוג הגשה" (מזנונים/הגשה) שלב אותו; אחרת בחר בגרסת "מזנונים" הרגילה כברירת מחדל.
- באזור "התחייבות חתומה" (או אזור דומה של פרטי ההתחייבות - למשל "התחייבות חתומה התקבלה") מופיעים שדות מספריים נפרדים - "אורחים בטוחים"/"מינימום אורחים", "מנות ילדים", "מנות גלאט", "מנות צמחוניות", "מנות טבעוניות", "מנות ללא גלוטן" ו"ילדים מתחת לגיל 2". אלו שדות נפרדים - אל תחשב ביניהם, החזר את הערך הגולמי שמופיע ליד כל תווית בלבד (0 אם כתוב במפורש 0, null אם השדה לא מופיע כלל בתור מספר).
- התמונה היא לרוב צילום מסך עמוס של עמוד שלם עם תיבות מידע קטנות רבות זו לצד זו ("התחייבות חתומה", "טפסים שלי", "משתמשים באירוע", "לוקחים חלק באירוע", "אפשרויות אירוע", "הזמנות להצטרף לאירוע", "נעילות", "פרטי אירוע" וכו') - יש לסרוק את כל התמונה בעיון רב, תיבה אחר תיבה, ולא להסתפק במבט חטוף. אזור "התחייבות חתומה" בפרט קריטי ביותר ואסור לפספס אותו: אם התיבה נראית בתמונה כלל (גם אם הטקסט בתוכה קטן), יש לקרוא את כל הערכים המספריים שבתוכה בקפידה ולעולם לא להחזיר null עבור guests_secure/guests_reserve רק בגלל שהטקסט קטן או שהתיבה עמוסה בתיבות נוספות סביבה - יש להתאמץ ולזהות אותם.
- שים לב: לעיתים העמוד מציג גם אזור נפרד בשם "אפשרויות אירוע" עם רשימת סימוני וי/איקס (✓/✗) ליד תוויות כמו "סימון מנות ילדים", "סימון מנות גלאט" וכו' - אלו הם מתגי הפעלה בלבד (מציינים שהתכונה קיימת לאירוע), ולא מספרים בפועל. אסור לפרש סימן וי כ"1" או להמציא כמות מהם - שדות kids_meals/glat_meals/vegetarian_meals/vegan_meals/gluten_free_meals/toddlers_under_2 צריכים להתמלא רק אם מופיע לצידם מספר ממשי במקום כלשהו בעמוד (למשל באזור ההתחייבות עצמו), אחרת החזר null.
- שדה הרזרבה יכול להופיע בשני פורמטים שונים בהתאם לגרסת המסך - לפעמים כמספר אורחים ("אורחים רזרבה: 20") ולפעמים כאחוז ("% רזרבה מקסימלי: 7"). זהה איזה משני הפורמטים מופיע בתמונה והחזר את הערך הגולמי בשדה guests_reserve (מספר) או guests_reserve_percent (אחוז) בהתאם - לעולם לא בשניהם יחד.
- טלפון ואימייל של איש/אשת הקשר: אם אזור "משתמשים באירוע" ריק (כתוב בו "אין") או לא מכיל טלפון/אימייל, חפש אותם ברשימת "הזמנות להצטרף לאירוע" - כל שורה שם מציגה טלפון או אימייל עם תיוג (חתן)/(כלה) ליד שם איש הקשר; שייך כל טלפון/אימייל לפי התיוג הזה (חתן -> contact_phone/contact_email, כלה -> contact_phone_2/contact_email_2, או להפך אם רק צד אחד מופיע - חשוב על עצמך כדי לשייך נכון בין השניים).
- שדה sales_person_name: לרוב אין שדה מפורש בשם "איש/ת מכירות" בעמוד - במקרה הזה יש להשתמש בשדה "נוצר ע"י:" מתוך כרטיס "פרטי אירוע" (ליד "נוצר ב:") כברירת מחדל, שכן זהו איש/ת המכירות שיצר/ה את האירוע.

--- הנחיות לסוג "commitment_email" ---
- שמות בני הזוג ותאריך האירוע מופיעים בשורת הנושא של המייל (למשל "התחייבות סופית - אלמוג הלחמי וגל תשובה - 25.08.26"), לעיתים גם חוזרים בשורה הראשונה של תוכן המייל. חלץ אותם לפי אותם כללי עברית-בלבד כמו בסוג iplan_screen.
- שדה guests_secure הוא המספר הכולל הסופי שליד "העלו כמות ל"/"העלו כמות -" ולידו "מבוגרים" - אינו כולל רזרבה (אין נתוני רזרבה במייל זה כלל - guests_reserve ו-guests_reserve_percent תמיד null).
- סעיף "מתוכם { ... }" (אם מופיע) מפרט כמה מתוך המספר שכבר חולץ ל-guests_secure שייכים לכל סוג מנה מיוחדת (גלאט/צמחוני/טבעוני/ללא גלוטן) - אלו כבר נכללים בתוך guests_secure ואינם תוספת עליו. חלץ אותם לשדות glat_meals/vegetarian_meals/vegan_meals/gluten_free_meals בהתאם.
- סעיף "בנוסף" (או "בנוסף:") מפרט תוספות שאינן חלק מהמספר ב-guests_secure - לרוב "מנות ילדים"/"ילדים", ולעיתים עם פיצול משנה "מעל"/"תינוק". אם מופיע מספר יחיד ("בנוסף: 7 מנות ילדים" או "בנוסף 18 ילדים") שים אותו ב-kids_meals. אם מופיע פיצול ("1 - מעל" ו-"1 - תינוק") שים את מספר ה"מעל" ב-kids_meals ואת מספר ה"תינוק" ב-toddlers_under_2.
- התעלם לחלוטין מכל פרט אחר במייל שאינו אחד מהשדות שלעיל (למשל סוג בר, קוקטיילים, עמדת לייט גייט, אפטר, שם מעצב/ת, הערות חניה, "חתונה הפוכה", או הערות/בקשות אישיות לצוות) - אל תשבץ אותם בשום שדה.
- שדות event_manager_name, sales_person_name, service_style, contact_phone, contact_phone_2, contact_email, contact_email_2 כמעט אף פעם לא מופיעים במייל מסוג זה - החזר null עבורם במקרה הרגיל.

--- הנחיה כללית לשני הסוגים ---
- תאריכים בתמונה עשויים להופיע כ-DD/MM/YYYY או DD.MM.YY - המר תמיד לפורמט YYYY-MM-DD.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Whether this attempt's failure should move on to the next attempt in the
// ladder rather than abort the whole extraction. Originally just Gemini's
// transient 503 "UNAVAILABLE" (high demand), which usually clears within a
// second or two - but a 429 RESOURCE_EXHAUSTED (a model-specific rate/quota
// limit) is the same situation in practice: THIS tier is unavailable to us
// right now, other tiers may well not be. Confirmed live in production that
// treating only 503s this way was a real bug - a single 429 from one tier
// was throwing immediately and skipping every other attempt in the ladder
// (including tiers that had never been tried yet), surfacing Gemini's raw
// JSON error to the user instead of retrying.
function isTransientOverload(err: unknown): boolean {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return true;
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("UNAVAILABLE") ||
    message.includes("high demand") ||
    message.includes('"code":503') ||
    message.includes('"code":429') ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

// Full-page "ענן" screenshots are dense with many small side-by-side panels,
// and the lite tier has missed clearly-visible fields here on real
// screenshots (e.g. the guest-commitment panel) that the non-lite flash tier
// reads more reliably. That said, per explicit venue request, upload speed
// now matters more than squeezing out that last bit of accuracy - staff
// would rather double-check a couple of fields than wait through repeated
// "server busy" overload errors - so lite is the default here, with the
// slower/more-accurate flash tier kept only as a fallback if lite itself is
// overloaded.
const PRIMARY_MODEL = "gemini-flash-lite-latest";
const FALLBACK_MODEL = "gemini-flash-latest";
// A third tier (a pinned, non-"-latest" model) was tried here as a
// last-resort fallback, on the theory that a pinned version draws from
// different capacity than the two aliases above. Dropped after confirming
// live that the newest pinned models carry a much harsher free-tier daily
// quota than the two established aliases (20 requests/day, vs. the aliases'
// much higher limits - see this file's history) - it exhausted almost
// immediately under real use and added no real resilience, just another way
// to fail. If Gemini billing ever moves off the free tier, revisit adding
// one back.

function callGemini(ai: GoogleGenAI, buffer: Buffer, mimeType: string, model: string, signal: AbortSignal) {
  return ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: buffer.toString("base64") } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      // This is a read-the-label-off-the-screen task, not a creative one -
      // temperature 0 removes sampling variance that was otherwise letting
      // the model drop one clearly-visible field on one pass (e.g. the
      // date box, or the guest-commitment count) while getting everything
      // else right.
      temperature: 0,
      abortSignal: signal,
    },
  });
}

// Round-robins between both tiers before ever repeating one, with only a
// short pause between attempts. Retrying the SAME tier twice in a row (the
// original design) wastes time and a whole retry slot when that tier is
// under sustained load rather than a momentary blip - it only reaches the
// (likely-healthy) other tier on the third attempt, and with 1-3s of
// deliberate backoff piled on top of that, uploads felt slow even when a
// working tier was one call away.
//
// Confirmed live in production that Gemini can put both tiers into
// simultaneous "high demand" 503s at once - a real platform-wide spike, not
// a per-tier issue, so no amount of tier-picking alone guarantees success
// during one, and this venue has now hit that squeeze more than once in a
// single session. Trimmed from six passes to three per explicit request:
// once a spike is severe enough to survive three round-robin passes, waiting
// through three more rarely helps and just delays the friendly "busy, try
// again" message - better to fail fast and let staff retry by hand a moment
// later than sit through it.
const EXTRACTION_ATTEMPTS: { model: string; delayMsBefore: number }[] = [
  { model: PRIMARY_MODEL, delayMsBefore: 0 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
  { model: PRIMARY_MODEL, delayMsBefore: 500 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
  { model: PRIMARY_MODEL, delayMsBefore: 700 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
];

// The page that hosts this upload caps the whole Server Action at 60s
// (app/events/import-image/page.tsx's maxDuration) - if a single Gemini call
// stalls (slow network, a hung connection) rather than cleanly erroring, the
// old code had nothing forcing it to give up, so it could sit until Vercel
// hard-kills the function mid-response. That kill truncates the response the
// browser is waiting on, which surfaces as React's generic "An unexpected
// response was received from the server" - an unstyled English error the
// user can't act on, instead of the friendly Hebrew "busy, try again"
// message this function already has for the ordinary overload case. Capping
// the whole retry loop's wall-clock time (well under 60s) and each
// individual call within it (via abortSignal) means a stuck call always
// fails fast into that existing friendly path instead.
const EXTRACTION_BUDGET_MS = 25_000;
const PER_CALL_TIMEOUT_MS = 12_000;

async function requestExtraction(ai: GoogleGenAI, buffer: Buffer, mimeType: string): Promise<GeminiExtraction> {
  const startedAt = Date.now();
  let response: Awaited<ReturnType<typeof callGemini>> | undefined;
  let lastError: unknown;

  for (const attempt of EXTRACTION_ATTEMPTS) {
    if (Date.now() - startedAt + attempt.delayMsBefore >= EXTRACTION_BUDGET_MS) break;
    if (attempt.delayMsBefore > 0) await sleep(attempt.delayMsBefore);

    const remaining = EXTRACTION_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      response = await callGemini(ai, buffer, mimeType, attempt.model, AbortSignal.timeout(Math.min(PER_CALL_TIMEOUT_MS, remaining)));
      break;
    } catch (err) {
      lastError = err;
      // A non-transient error (bad request, auth, schema) is very unlikely to
      // behave differently on the next tier, so stop burning attempts on it -
      // but fall through to the same friendly-message handling below rather
      // than throwing it directly (see that block's comment for why).
      if (!isTransientOverload(err)) break;
    }
  }

  if (!response) {
    // Never let Gemini's own error - a raw, English, often JSON-shaped
    // string - reach the UI: it's meaningless to venue staff and was showing
    // up verbatim (e.g. a 429 quota message) before this. Always show the
    // one friendly Hebrew message instead, and log the real cause
    // server-side (Vercel logs) for whoever actually needs to debug it.
    if (lastError !== undefined) console.error("Image extraction failed:", lastError);
    throw new Error("שירות זיהוי התמונה עמוס כרגע - נסו שוב בעוד רגע.");
  }

  const rawText = response.text;
  if (!rawText) throw new Error("לא התקבלה תשובה מ-Gemini");

  try {
    return JSON.parse(rawText) as GeminiExtraction;
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }
}

export async function extractEventDraftFromImage(buffer: Buffer, mimeType: string): Promise<ImageImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  // A single pass, not two parallel ones merged together - the second pass
  // existed purely to catch an occasional missed field, which is a quality
  // tradeoff staff explicitly asked to give up here in exchange for firing
  // half as many Gemini requests per upload (directly easing the overload
  // errors that come from Gemini being under high demand) and not waiting on
  // the slower of two calls.
  const extraction = await requestExtraction(ai, buffer, mimeType);

  return buildImageImportDraft(extraction);
}

// Pure merge/derivation step, split out from extractEventDraftFromImage so
// the guest-count math (the part that's actually gone wrong before) can be
// unit-tested without mocking the Gemini API.
export function buildImageImportDraft(extraction: GeminiExtraction): ImageImportDraft {
  const warnings: string[] = [
    "החילוץ מתמונה עלול לכלול טעויות - יש לבדוק את כל השדות בקפידה לפני יצירת האירוע.",
  ];

  const bride_name = extraction.bride_name?.trim() || null;
  const groom_name = extraction.groom_name?.trim() || null;
  const name = bride_name && groom_name ? `${bride_name} ו${groom_name}` : bride_name || groom_name || "";
  if (!name) warnings.push('לא זוהו שמות בני הזוג - יש להזין ידנית את שדה "שם הלקוח / הזוג"');

  if (!extraction.event_date) warnings.push("לא זוהה תאריך אירוע - יש להזין ידנית");
  if (!EVENT_TYPE_KEYS.includes(extraction.event_type)) {
    warnings.push('סוג האירוע שזוהה אינו תקין - נבחר "אחר" כברירת מחדל');
  }

  // "אורחים בטוחים" plus the four meal-type headcounts (גלאט/צמחוני/טבעוני/
  // ללא גלוטן) together make up the guaranteed-guests figure on an iplan_screen
  // read. A commitment_email read is different: its guests_secure ("X
  // מבוגרים") is already inclusive of those meal-type counts ("מתוכם" = "of
  // which"), so adding them again here would double-count. The reserve on
  // top of that can appear either as a direct headcount ("אורחים רזרבה") or
  // as a percentage ("% רזרבה מקסימלי") depending on the screen version -
  // when it's a percentage, round the resulting fraction of a guest UP (5%
  // of 270 is 13.5, i.e. 14 reserve guests), never down. commitment_email
  // never shows reserve data at all (see applyCarriedReservePercent, applied
  // by the update-flow caller instead, which has the previous value to carry
  // a percentage forward from).
  const isCommitmentEmail = extraction.source_type === "commitment_email";
  const guestsSecure = extraction.guests_secure ?? null;
  const totalSecure =
    guestsSecure != null
      ? isCommitmentEmail
        ? guestsSecure
        : guestsSecure +
          (extraction.glat_meals ?? 0) +
          (extraction.vegetarian_meals ?? 0) +
          (extraction.vegan_meals ?? 0) +
          (extraction.gluten_free_meals ?? 0)
      : null;
  const guestsReserve =
    extraction.guests_reserve ??
    (totalSecure != null && extraction.guests_reserve_percent != null
      ? Math.ceil((totalSecure * extraction.guests_reserve_percent) / 100)
      : null);
  const estimated_guests =
    totalSecure != null && guestsReserve != null
      ? `${totalSecure}+${guestsReserve}`
      : totalSecure != null
        ? `${totalSecure}`
        : null;
  if (estimated_guests == null) {
    warnings.push('לא זוהו נתוני התחייבות אורחים - יש להזין ידנית את שדה "מספר אורחים - התחייבות"');
  }

  const kids_meal_count = extraction.kids_meals != null ? String(extraction.kids_meals) : null;
  // Diet-type portion counts (unlike kids/toddlers headcounts) aren't worth
  // recording as an explicit "0" - a 0 here just means that diet type wasn't
  // ordered, so leave the field blank rather than filling it with "0".
  const glat_meal_count = extraction.glat_meals ? String(extraction.glat_meals) : null;
  const vegetarian_meal_count = extraction.vegetarian_meals ? String(extraction.vegetarian_meals) : null;
  const vegan_meal_count = extraction.vegan_meals ? String(extraction.vegan_meals) : null;
  const gluten_free_meal_count = extraction.gluten_free_meals ? String(extraction.gluten_free_meals) : null;
  const toddlers_under_2_count = extraction.toddlers_under_2 != null ? String(extraction.toddlers_under_2) : null;

  // Friday weddings end ~5.5h after the reception starts (Shabbat) rather
  // than the usual late finish - fill this in only when iPlan itself didn't
  // give an explicit end time, never override a real extracted value.
  let end_time = extraction.end_time ?? null;
  if (!end_time && extraction.start_time && isFriday(extraction.event_date ?? null)) {
    end_time = fridayEndTime(extraction.start_time);
    if (end_time) warnings.push('שעת הסיום לא זוהתה - חושבה אוטומטית לפי כלל יום שישי (5.5 שעות מקבלת הפנים)');
  }

  return {
    name,
    bride_name,
    groom_name,
    event_type: EVENT_TYPE_KEYS.includes(extraction.event_type) ? extraction.event_type : "other",
    event_date: extraction.event_date ?? null,
    start_time: extraction.start_time ?? null,
    end_time,
    event_manager_name: extraction.event_manager_name?.trim() || null,
    sales_person_name: extraction.sales_person_name?.trim() || null,
    service_style: extraction.service_style?.trim() || null,
    contact_phone: extraction.contact_phone?.trim() || null,
    contact_phone_2: extraction.contact_phone_2?.trim() || null,
    contact_email: extraction.contact_email?.trim() || null,
    contact_email_2: extraction.contact_email_2?.trim() || null,
    estimated_guests,
    kids_meal_count,
    glat_meal_count,
    vegetarian_meal_count,
    vegan_meal_count,
    gluten_free_meal_count,
    toddlers_under_2_count,
    menu_notes: null,
    source_type: isCommitmentEmail ? "commitment_email" : "iplan_screen",
    warnings,
  };
}

const RESERVE_FORMAT = /^(\d+)\+(\d+)$/;

// A commitment_email screenshot only ever gives a final secure-guest total,
// never a reserve figure (unlike iplan_screen, which sometimes shows one
// directly) - so on an event update, carry forward the reserve as whatever
// percentage of secure guests it was before this update, applied to the new
// total. E.g. previously "300+15" (5%) and a new total of 340 -> "340+17".
// Never round the resulting reserve down, matching the iplan_screen
// percentage rule above. Falls back to the plain total (no "+reserve") when
// there's no previous "secure+reserve" value to carry a percentage from.
export function applyCarriedReservePercent(totalSecure: number, previousEstimatedGuests: string | null): string {
  const match = previousEstimatedGuests?.match(RESERVE_FORMAT);
  if (!match) return String(totalSecure);

  const previousSecure = Number(match[1]);
  const previousReserve = Number(match[2]);
  if (previousSecure <= 0) return String(totalSecure);

  const reservePercent = previousReserve / previousSecure;
  const reserve = Math.ceil(totalSecure * reservePercent);
  return `${totalSecure}+${reserve}`;
}
