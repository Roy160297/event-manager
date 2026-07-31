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
  kids_meals: number | null;
  glat_meals: number | null;
  vegetarian_meals: number | null;
  vegan_meals: number | null;
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
    guests_secure: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "אורחים בטוחים"' },
    guests_reserve: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "אורחים רזרבה"' },
    kids_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות ילדים"' },
    glat_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות גלאט"' },
    vegetarian_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות צמחוניות"' },
    vegan_meals: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מנות טבעוניות"' },
    toddlers_under_2: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "ילדים מתחת לגיל 2"' },
  },
  required: ["event_type"],
};

const PROMPT = `זהו צילום מסך של עמוד אירוע ממסך "ענן" במערכת iPlan. חלץ ממנו את הנתונים הבאים והחזר JSON בלבד לפי הסכמה שסופקה.

הנחיות חשובות:
- אם שדה אינו מופיע בבירור בתמונה, החזר null עבורו - לעולם אל תמציא ערך.
- שם הזוג מופיע בכותרת הראשית של העמוד (למשל "יובל ורדי ואיילון אלקיים") ולעיתים גם באזור "משתמשים באירוע" או ברשימת "הזמנות להצטרף לאירוע", שם כל איש קשר מתויג בסוגריים (חתן)/(כלה). ייתכן זוג מאותו מין - שני הצדדים מתויגים "חתן" (זוג חתנים) או ששניהם מתויגים "כלה" (זוג כלות). במקרה כזה אל תכריח התאמה של חתן אחד וכלה אחת - חלץ את שני השמות יחד לפי ההנחיות בשדות bride_name/groom_name.
- שמות בני הזוג (וכל שם אחר שאתה מחלץ) חייבים להיות בעברית בלבד, לעולם לא באנגלית/אותיות לועזיות. אם שם מופיע באנגלית באזור "משתמשים באירוע" (למשל שם משתמש), בעוד שאותו אדם מופיע בעברית בכותרת הראשית של העמוד - יש להשתמש תמיד בגרסה העברית מהכותרת ולהתעלם לחלוטין מהגרסה האנגלית.
- תאריך, שעת התחלה ושעת סיום מופיעים בתיבות הכחולות בפינה השמאלית העליונה של העמוד.
- שדה "event_type" חייב להיות אחד מהערכים המותרים בסכמה בלבד. קבע אותו לפי תווית סוג האירוע המוצגת (למשל "חתונה"). אם מופיע גם פירוט "סוג הגשה" (מזנונים/הגשה) שלב אותו; אחרת בחר בגרסת "מזנונים" הרגילה כברירת מחדל.
- באזור "התחייבות חתומה התקבלה" (או אזור דומה של פרטי ההתחייבות) מופיעים מספר שדות נפרדים - "אורחים בטוחים", "אורחים רזרבה", "מנות ילדים", "מנות גלאט", "מנות צמחוניות", "מנות טבעוניות" ו"ילדים מתחת לגיל 2". אלו שדות מספריים נפרדים - אל תחשב ביניהם, החזר את הערך הגולמי שמופיע ליד כל תווית בלבד (0 אם כתוב במפורש 0, null אם השדה לא מופיע כלל).
- טלפון ואימייל של איש/אשת הקשר: אם אזור "משתמשים באירוע" ריק (כתוב בו "אין") או לא מכיל טלפון/אימייל, חפש אותם ברשימת "הזמנות להצטרף לאירוע" - כל שורה שם מציגה טלפון או אימייל עם תיוג (חתן)/(כלה) ליד שם איש הקשר; שייך כל טלפון/אימייל לפי התיוג הזה (חתן -> contact_phone/contact_email, כלה -> contact_phone_2/contact_email_2, או להפך אם רק צד אחד מופיע - חשוב על עצמך כדי לשייך נכון בין השניים).
- תאריכים בתמונה מופיעים לרוב כ-DD/MM/YYYY - המר לפורמט YYYY-MM-DD.`;

export async function extractEventDraftFromImage(buffer: Buffer, mimeType: string): Promise<ImageImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-flash-lite-latest",
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

  // "אורחים בטוחים" plus the three meal-type headcounts (גלאט/צמחוני/טבעוני)
  // together make up the guaranteed-guests figure; "אורחים רזרבה" is a
  // separate, already-computed number on this screen (not a percentage to
  // derive it from, unlike the older iPlan commitment page).
  const guestsSecure = extraction.guests_secure ?? null;
  const guestsReserve = extraction.guests_reserve ?? null;
  const totalSecure =
    guestsSecure != null
      ? guestsSecure + (extraction.glat_meals ?? 0) + (extraction.vegetarian_meals ?? 0) + (extraction.vegan_meals ?? 0)
      : null;
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

  const toddlersUnder2 = extraction.toddlers_under_2 ?? null;
  const menu_notes = toddlersUnder2 && toddlersUnder2 > 0 ? `צריך לדאוג ל-${toddlersUnder2} כסאות תינוק` : null;

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
    menu_notes,
    warnings,
  };
}
