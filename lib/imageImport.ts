import { GoogleGenAI, Type } from "@google/genai";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
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
  guests_min: number | null;
  guests_reserve_percent: number | null;
  estimated_guests: string | null;
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
  guests_min: number | null;
  guests_reserve_percent: number | null;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bride_name: { type: Type.STRING, nullable: true, description: "שם הכלה בלבד" },
    groom_name: { type: Type.STRING, nullable: true, description: "שם החתן בלבד" },
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
    guests_min: { type: Type.NUMBER, nullable: true, description: 'המספר משדה "מינימום אורחים"' },
    guests_reserve_percent: {
      type: Type.NUMBER,
      nullable: true,
      description: 'האחוז משדה "רזרבה מקסימלי %"',
    },
  },
  required: ["event_type"],
};

const PROMPT = `זהו צילום מסך של עמוד אירוע ממערכת iPlan. חלץ ממנו את הנתונים הבאים והחזר JSON בלבד לפי הסכמה שסופקה.

הנחיות חשובות:
- אם שדה אינו מופיע בבירור בתמונה, החזר null עבורו - לעולם אל תמציא ערך.
- שם הזוג בדרך כלל מופיע כ"שם פרטי+שם משפחה" עבור כל אחד מבני הזוג באזור "משתמשים באירוע" - זהה מי מהם חתן ומי כלה.
- שדה "event_type" חייב להיות אחד מהערכים המותרים בסכמה בלבד. קבע אותו לפי שילוב תווית סוג האירוע הראשית (למשל "חתונה") עם שדה "סוג הגשה" (למשל "מזנונים" או "הגשה") באזור ההתחייבות/פרטי האירוע.
- "מינימום אורחים" ו"רזרבה מקסימלי %" הם שני שדות נפרדים באזור ההתחייבות - אל תחשב ביניהם, החזר את שני המספרים הגולמיים בלבד.
- תאריכים בתמונה מופיעים לרוב כ-DD/MM/YYYY - המר לפורמט YYYY-MM-DD.`;

export async function extractEventDraftFromImage(buffer: Buffer, mimeType: string): Promise<ImageImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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

  const guests_min = extraction.guests_min ?? null;
  const guests_reserve_percent = extraction.guests_reserve_percent ?? null;
  const estimated_guests =
    guests_min != null && guests_reserve_percent != null
      ? `${guests_min}+${Math.round((guests_min * guests_reserve_percent) / 100)}`
      : null;

  return {
    name,
    bride_name,
    groom_name,
    event_type: EVENT_TYPE_KEYS.includes(extraction.event_type) ? extraction.event_type : "other",
    event_date: extraction.event_date ?? null,
    start_time: extraction.start_time ?? null,
    end_time: extraction.end_time ?? null,
    event_manager_name: extraction.event_manager_name?.trim() || null,
    sales_person_name: extraction.sales_person_name?.trim() || null,
    service_style: extraction.service_style?.trim() || null,
    contact_phone: extraction.contact_phone?.trim() || null,
    contact_phone_2: extraction.contact_phone_2?.trim() || null,
    contact_email: extraction.contact_email?.trim() || null,
    contact_email_2: extraction.contact_email_2?.trim() || null,
    guests_min,
    guests_reserve_percent,
    estimated_guests,
    warnings,
  };
}
