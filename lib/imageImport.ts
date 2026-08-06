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
  warnings: string[];
}

const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPE_LABELS) as EventType[];

interface GeminiExtraction {
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
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
      description: 'המספר משדה "אורחים בטוחים", או משדה "מינימום אורחים" אם זה השם המופיע במקום זאת - אותו שדה בשני שמות אפשריים',
    },
    guests_reserve: {
      type: Type.NUMBER,
      nullable: true,
      description: 'המספר הגולמי משדה "אורחים רזרבה", רק אם הוא מוצג כמספר אורחים ולא כאחוז',
    },
    guests_reserve_percent: {
      type: Type.NUMBER,
      nullable: true,
      description: 'האחוז הגולמי משדה הרזרבה (לדוגמה "% רזרבה מקסימלי"), רק אם הוא מוצג כאחוז ולא כמספר אורחים',
    },
    kids_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות ילדים"' },
    glat_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות גלאט"' },
    vegetarian_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות צמחוניות"' },
    vegan_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות טבעוניות"' },
    gluten_free_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות ללא גלוטן"' },
    toddlers_under_2: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "ילדים מתחת לגיל 2"' },
  },
  required: ["event_type"],
};

const PROMPT = `זהו צילום מסך של עמוד אירוע ממסך "ענן" במערכת iPlan. חלץ ממנו את הנתונים הבאים והחזר JSON בלבד לפי הסכמה שסופקה.

הנחיות חשובות:
- אם שדה אינו מופיע בבירור בתמונה, החזר null עבורו - לעולם אל תמציא ערך.
- שם הזוג מופיע בכותרת הראשית של העמוד (למשל "יובל ורדי ואיילון אלקיים") ולעיתים גם באזור "משתמשים באירוע" או ברשימת "הזמנות להצטרף לאירוע", שם כל איש קשר מתויג בסוגריים (חתן)/(כלה). ייתכן זוג מאותו מין - שני הצדדים מתויגים "חתן" (זוג חתנים) או ששניהם מתויגים "כלה" (זוג כלות). במקרה כזה אל תכריח התאמה של חתן אחד וכלה אחת - חלץ את שני השמות יחד לפי ההנחיות בשדות bride_name/groom_name.
- שמות בני הזוג (וכל שם אחר שאתה מחלץ) חייבים להיות בעברית בלבד, לעולם לא באנגלית/אותיות לועזיות. אם שם מופיע באנגלית באזור "משתמשים באירוע" (למשל שם משתמש), בעוד שאותו אדם מופיע בעברית בכותרת הראשית של העמוד - יש להשתמש תמיד בגרסה העברית מהכותרת ולהתעלם לחלוטין מהגרסה האנגלית.
- תאריך, שעת התחלה ושעת סיום מופיעים בתיבות הכחולות בפינה השמאלית העליונה של העמוד. לעיתים התאריך מופיע בתוך אותה תיבה יחד עם שם היום בשבוע (למשל "יום ג' 11/08/2026") - במקרה כזה התעלם משם היום וחלץ רק את החלק המספרי של התאריך. אל תחזיר null עבור event_date אם יש בתיבה כלשהי רצף מספרים בפורמט תאריך (DD/MM/YYYY) - זהו כמעט תמיד תאריך האירוע.
- שדה "event_type" חייב להיות אחד מהערכים המותרים בסכמה בלבד. קבע אותו לפי תווית סוג האירוע המוצגת (למשל "חתונה"). אם מופיע גם פירוט "סוג הגשה" (מזנונים/הגשה) שלב אותו; אחרת בחר בגרסת "מזנונים" הרגילה כברירת מחדל.
- באזור "התחייבות חתומה" (או אזור דומה של פרטי ההתחייבות - למשל "התחייבות חתומה התקבלה") מופיעים שדות מספריים נפרדים - "אורחים בטוחים"/"מינימום אורחים", "מנות ילדים", "מנות גלאט", "מנות צמחוניות", "מנות טבעוניות", "מנות ללא גלוטן" ו"ילדים מתחת לגיל 2". אלו שדות נפרדים - אל תחשב ביניהם, החזר את הערך הגולמי שמופיע ליד כל תווית בלבד (0 אם כתוב במפורש 0, null אם השדה לא מופיע כלל בתור מספר).
- התמונה היא לרוב צילום מסך עמוס של עמוד שלם עם תיבות מידע קטנות רבות זו לצד זו ("התחייבות חתומה", "טפסים שלי", "משתמשים באירוע", "לוקחים חלק באירוע", "אפשרויות אירוע", "הזמנות להצטרף לאירוע", "נעילות", "פרטי אירוע" וכו') - יש לסרוק את כל התמונה בעיון רב, תיבה אחר תיבה, ולא להסתפק במבט חטוף. אזור "התחייבות חתומה" בפרט קריטי ביותר ואסור לפספס אותו: אם התיבה נראית בתמונה כלל (גם אם הטקסט בתוכה קטן), יש לקרוא את כל הערכים המספריים שבתוכה בקפידה ולעולם לא להחזיר null עבור guests_secure/guests_reserve רק בגלל שהטקסט קטן או שהתיבה עמוסה בתיבות נוספות סביבה - יש להתאמץ ולזהות אותם.
- שים לב: לעיתים העמוד מציג גם אזור נפרד בשם "אפשרויות אירוע" עם רשימת סימוני וי/איקס (✓/✗) ליד תוויות כמו "סימון מנות ילדים", "סימון מנות גלאט" וכו' - אלו הם מתגי הפעלה בלבד (מציינים שהתכונה קיימת לאירוע), ולא מספרים בפועל. אסור לפרש סימן וי כ"1" או להמציא כמות מהם - שדות kids_meals/glat_meals/vegetarian_meals/vegan_meals/gluten_free_meals/toddlers_under_2 צריכים להתמלא רק אם מופיע לצידם מספר ממשי במקום כלשהו בעמוד (למשל באזור ההתחייבות עצמו), אחרת החזר null.
- שדה הרזרבה יכול להופיע בשני פורמטים שונים בהתאם לגרסת המסך - לפעמים כמספר אורחים ("אורחים רזרבה: 20") ולפעמים כאחוז ("% רזרבה מקסימלי: 7"). זהה איזה משני הפורמטים מופיע בתמונה והחזר את הערך הגולמי בשדה guests_reserve (מספר) או guests_reserve_percent (אחוז) בהתאם - לעולם לא בשניהם יחד.
- טלפון ואימייל של איש/אשת הקשר: אם אזור "משתמשים באירוע" ריק (כתוב בו "אין") או לא מכיל טלפון/אימייל, חפש אותם ברשימת "הזמנות להצטרף לאירוע" - כל שורה שם מציגה טלפון או אימייל עם תיוג (חתן)/(כלה) ליד שם איש הקשר; שייך כל טלפון/אימייל לפי התיוג הזה (חתן -> contact_phone/contact_email, כלה -> contact_phone_2/contact_email_2, או להפך אם רק צד אחד מופיע - חשוב על עצמך כדי לשייך נכון בין השניים).
- תאריכים בתמונה מופיעים לרוב כ-DD/MM/YYYY - המר לפורמט YYYY-MM-DD.`;

export async function extractEventDraftFromImage(buffer: Buffer, mimeType: string): Promise<ImageImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    // Full-page "ענן" screenshots are dense with many small side-by-side
    // panels - the lite tier (used elsewhere for lighter extraction tasks)
    // has missed clearly-visible fields here (e.g. the guest-commitment
    // panel) on real screenshots, which is unacceptable for a number that
    // drives billing/headcount. The non-lite flash tier reads small/dense
    // text more reliably at a modest cost increase.
    model: "gemini-flash-latest",
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: buffer.toString("base64") } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const rawText = response.text;
  if (!rawText) throw new Error("לא התקבלה תשובה מ-Gemini");

  let extraction: GeminiExtraction;
  try {
    extraction = JSON.parse(rawText) as GeminiExtraction;
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }

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
  // ללא גלוטן) together make up the guaranteed-guests figure. The reserve on
  // top of that can appear either as a direct headcount ("אורחים רזרבה") or
  // as a percentage ("% רזרבה מקסימלי") depending on the screen version -
  // when it's a percentage, round the resulting fraction of a guest UP (5%
  // of 270 is 13.5, i.e. 14 reserve guests), never down.
  const guestsSecure = extraction.guests_secure ?? null;
  const totalSecure =
    guestsSecure != null
      ? guestsSecure +
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
  const glat_meal_count = extraction.glat_meals != null ? String(extraction.glat_meals) : null;
  const vegetarian_meal_count = extraction.vegetarian_meals != null ? String(extraction.vegetarian_meals) : null;
  const vegan_meal_count = extraction.vegan_meals != null ? String(extraction.vegan_meals) : null;
  const gluten_free_meal_count = extraction.gluten_free_meals != null ? String(extraction.gluten_free_meals) : null;
  const toddlers_under_2_count = extraction.toddlers_under_2 != null ? String(extraction.toddlers_under_2) : null;

  // Friday weddings end ~6.5h after the reception starts (Shabbat) rather
  // than the usual late finish - fill this in only when iPlan itself didn't
  // give an explicit end time, never override a real extracted value.
  let end_time = extraction.end_time ?? null;
  if (!end_time && extraction.start_time && isFriday(extraction.event_date ?? null)) {
    end_time = fridayEndTime(extraction.start_time);
    if (end_time) warnings.push('שעת הסיום לא זוהתה - חושבה אוטומטית לפי כלל יום שישי (6.5 שעות מקבלת הפנים)');
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
    warnings,
  };
}
