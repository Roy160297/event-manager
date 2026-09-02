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
    sales_person_name: { type: Type.STRING, nullable: true, description: 'שם איש/ת "מכירות", אם מופיע' },
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

// Gemini occasionally comes back with a transient 503 "UNAVAILABLE" (high
// demand) that clears within a second or two - distinguishing it from a
// genuine failure lets the caller decide whether a quick retry is worth it.
function isTransientOverload(err: unknown): boolean {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("UNAVAILABLE") || message.includes("high demand") || message.includes('"code":503');
}

// Full-page "ענן" screenshots are dense with many small side-by-side panels
// - the lite tier has missed clearly-visible fields here (e.g. the
// guest-commitment panel) on real screenshots, which is unacceptable for a
// number that drives billing/headcount. The non-lite flash tier reads
// small/dense text more reliably at a modest cost increase - it's the
// default, with lite kept only as an overload fallback below.
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-flash-lite-latest";

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

// Four attempts across two tiers, with growing backoff - a "high demand" 503
// is usually a momentary capacity blip, but it can occasionally last several
// seconds during a real spike, and this used to give up (surfacing the
// "busy, try again" error to the user) after only 3 attempts and a single
// 1s pause. Widening the window here means more of those spikes resolve
// silently instead of failing the upload. The lite tier draws from separate
// capacity from the flash tier, so falling back to it is worth it even
// before exhausting retries on flash - and worth retrying itself once too.
const EXTRACTION_ATTEMPTS: { model: string; delayMsBefore: number }[] = [
  { model: PRIMARY_MODEL, delayMsBefore: 0 },
  { model: PRIMARY_MODEL, delayMsBefore: 1000 },
  { model: FALLBACK_MODEL, delayMsBefore: 1500 },
  { model: FALLBACK_MODEL, delayMsBefore: 2500 },
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
const EXTRACTION_BUDGET_MS = 45_000;
const PER_CALL_TIMEOUT_MS = 20_000;

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
      if (!isTransientOverload(err)) throw err;
    }
  }

  if (!response) {
    // Callers must return this message rather than throw it: Next.js
    // redacts thrown Server Action error messages in production regardless
    // of where the throw is caught. Budget exhaustion with no other error
    // (lastError still undefined) is itself a form of "too slow right now",
    // so it gets the same friendly message as a real overload.
    if (lastError === undefined || isTransientOverload(lastError)) {
      throw new Error("שירות זיהוי התמונה עמוס כרגע - נסו שוב בעוד רגע.");
    }
    throw lastError;
  }

  const rawText = response.text;
  if (!rawText) throw new Error("לא התקבלה תשובה מ-Gemini");

  try {
    return JSON.parse(rawText) as GeminiExtraction;
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }
}

// A single Gemini pass over a dense screenshot occasionally comes back with
// one obviously-visible field left null while everything else is correct -
// re-running the identical request reliably catches what the first pass
// missed. Merge rather than replace: trust the first pass's non-null values
// and only fill the gaps, since the retry itself isn't guaranteed to be
// strictly better on every field.
export function mergeExtractions(primary: GeminiExtraction, retry: GeminiExtraction): GeminiExtraction {
  const merged = { ...primary };
  for (const key of Object.keys(retry) as (keyof GeminiExtraction)[]) {
    if (merged[key] == null && retry[key] != null) {
      (merged as Record<string, unknown>)[key] = retry[key];
    }
  }
  return merged;
}

export async function extractEventDraftFromImage(buffer: Buffer, mimeType: string): Promise<ImageImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  // Two independent passes, always run concurrently rather than a serial
  // "try once, then only retry if a critical field came back missing" - a
  // single dense-screenshot Gemini call already takes several seconds, and
  // that serial retry (which triggers often enough on these screenshots to
  // be the main reason uploads "take forever") used to double the real
  // wall-clock wait whenever it fired. Running both up front keeps worst-case
  // latency close to one call's time instead of two calls' time, at the cost
  // of always paying for a second Gemini call - a few cents, trivial next to
  // staff time, even on the uploads that didn't strictly need one.
  const [first, second] = await Promise.all([
    requestExtraction(ai, buffer, mimeType),
    requestExtraction(ai, buffer, mimeType),
  ]);
  const extraction = mergeExtractions(first, second);

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
