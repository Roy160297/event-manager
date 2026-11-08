import { GoogleGenAI, Type } from "@google/genai";
import { isTransientOverload } from "@/lib/imageImport";
import { normalizeIsraeliPhone } from "@/lib/supplierImport";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import type { PrivateEventType } from "@/lib/types";

// Reads Roy's own signed "הסכם למתן שירותי ניהול אירועים" (a scanned/photographed
// PDF with the client details filled in by hand) into the fields of a private
// event. Everything extracted here is only a draft - the wizard shows it for
// review before anything is saved.

export interface ContractImportDraft {
  name: string;
  event_type: PrivateEventType;
  event_date: string | null;
  start_time: string | null;
  hall_name: string | null;
  estimated_guests: string | null;
  contact_email: string | null;
  contact_email_2: string | null;
  contact_phone: string | null;
  contact_phone_2: string | null;
  warnings: string[];
}

export interface ContractExtraction {
  client_1_name: string | null;
  client_2_name: string | null;
  event_type: PrivateEventType | null;
  event_date: string | null;
  // The date exactly as it is printed on the page, for the day/month check.
  event_date_printed: string | null;
  start_time: string | null;
  // A second time when the form has two written (e.g. "19:00 / 18:30").
  start_time_alt: string | null;
  hall_name: string | null;
  estimated_guests: string | null;
  client_1_phone: string | null;
  client_2_phone: string | null;
  client_1_email: string | null;
  client_2_email: string | null;
}

const EVENT_TYPE_KEYS = Object.keys(PRIVATE_EVENT_TYPE_LABELS) as PrivateEventType[];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    client_1_name: {
      type: Type.STRING,
      nullable: true,
      description: 'השם המלא (פרטי ומשפחה) שנכתב ביד בשורה "שם מלא" מס\' 1 תחת "בין ... לבין", בעברית.',
    },
    client_2_name: {
      type: Type.STRING,
      nullable: true,
      description: 'השם המלא (פרטי ומשפחה) שנכתב ביד בשורה "שם מלא" מס\' 2, בעברית. null אם יש לקוח אחד בלבד.',
    },
    event_type: {
      type: Type.STRING,
      nullable: true,
      enum: EVENT_TYPE_KEYS,
      description:
        EVENT_TYPE_KEYS.map((key) => `${key} = ${PRIVATE_EVENT_TYPE_LABELS[key]}`).join(", ") +
        '. נקבע לפי "סוג האירוע" שבסעיף 1. כשכתוב "חתונה" בלבד - wedding.',
    },
    event_date: {
      type: Type.STRING,
      nullable: true,
      description:
        'תאריך האירוע בפורמט YYYY-MM-DD, מסעיף 1. הפורמט המודפס בחוזה הוא בדרך כלל DD/MM/YYYY (יום/חודש/שנה) - המר בהתאם.',
    },
    event_date_printed: {
      type: Type.STRING,
      nullable: true,
      description: "התאריך בדיוק כפי שהוא מודפס בחוזה, ללא המרה (למשל 08/04/2027).",
    },
    start_time: {
      type: Type.STRING,
      nullable: true,
      description: 'שעת תחילת האירוע בפורמט HH:MM, כפי שנכתבה ביד ליד "שעת תחילת האירוע". אם נכתבו שתי שעות - הראשונה שנכתבה.',
    },
    start_time_alt: {
      type: Type.STRING,
      nullable: true,
      description: "השעה השנייה בפורמט HH:MM, רק אם נכתבו שתי שעות באותו שדה (למשל 19:00 / 18:30). אחרת null.",
    },
    hall_name: {
      type: Type.STRING,
      nullable: true,
      description: 'שם המקום/האולם משדה "מקום/אולם האירוע" (בדרך כלל מודפס).',
    },
    estimated_guests: {
      type: Type.STRING,
      nullable: true,
      description: 'מספר האורחים המשוער שנכתב ליד "כמות אורחים משוערת", ספרות בלבד.',
    },
    client_1_phone: { type: Type.STRING, nullable: true, description: "טלפון שנכתב ביד עבור לקוח 1." },
    client_2_phone: { type: Type.STRING, nullable: true, description: "טלפון שנכתב ביד עבור לקוח 2." },
    client_1_email: { type: Type.STRING, nullable: true, description: 'דוא"ל שנכתב ביד עבור לקוח 1, באותיות לטיניות.' },
    client_2_email: { type: Type.STRING, nullable: true, description: 'דוא"ל שנכתב ביד עבור לקוח 2, באותיות לטיניות.' },
  },
};

const PROMPT = `זהו סריקה או צילום (PDF) של הסכם חתום למתן שירותי "ניהול אירועים" בין מנהל האירוע (רועי פוריאן) לבין בני זוג (הלקוחות). הטקסט המודפס הוא תבנית קבועה; פרטי הלקוחות והאירוע ממולאים ביד או מודפסים בשדות הריקים. חלץ את הפרטים הבאים והחזר JSON בלבד לפי הסכמה שסופקה.

הנחיות חשובות:
- חלץ רק את פרטי הלקוחות והאירוע. התעלם לחלוטין מפרטי מנהל האירוע (רועי פוריאן - שמו, טלפון, אימייל וכתובתו המודפסים בראש ההסכם), מסכומי התמורה, מלוח התשלומים ומתנאי ההסכם.
- אל תחלץ מספרי תעודת זהות ואל תחלץ כתובת מגורים של הלקוחות.
- שמות הלקוחות חייבים להיות בעברית. אם כתב היד לא קריא בבירור - החזר את הקריאה הטובה ביותר שלך, ולעולם אל תמציא פרטים שאינם מופיעים.
- שדה שאינו מופיע או אינו קריא בכלל - החזר null.
- הטלפונים והאימיילים של הלקוחות נכתבו ביד סמוך לשורות הלקוחות. שייך כל אחד ללקוח 1 או ללקוח 2 לפי הסדר והקרבה לשורות; אם אי אפשר לדעת, לפי סדר הופעתם.
- בשדה "שעת תחילת האירוע" לעיתים נכתבות ביד שתי שעות (למשל "19:00 / 18:30") - החזר את שתיהן (start_time ו-start_time_alt).
- אל תתייחס לחתימות ולתאריך החתימה שבתחתית ההסכם.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same lite-then-flash round-robin as lib/imageImport.ts and
// lib/supplierImport.ts, but starting on flash: this is handwriting on a
// scan, which the lite tier reads noticeably worse than printed screenshot
// text, and a contract is uploaded once per event so a second or two of
// extra reading time doesn't matter the way it does for the venue's staff.
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-flash-lite-latest";

const EXTRACTION_ATTEMPTS: { model: string; delayMsBefore: number }[] = [
  { model: PRIMARY_MODEL, delayMsBefore: 0 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
  { model: PRIMARY_MODEL, delayMsBefore: 500 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
];

// Kept under the 60s maxDuration of the page that hosts the upload, so a
// stuck call fails into the friendly message instead of Vercel killing the
// function mid-response.
const EXTRACTION_BUDGET_MS = 40_000;
const PER_CALL_TIMEOUT_MS = 25_000;

// The uploaded file's own name often carries the couple's first names
// ("... חתונה אלמוג וטאי חתום.pdf"), spelled right - a useful tiebreaker for
// handwriting that can be read two ways.
function promptFor(fileName: string | null): string {
  const hint = fileName?.replace(/\.pdf$/i, "").trim();
  if (!hint) return PROMPT;
  return `${PROMPT}
- שם הקובץ שהועלה הוא "${hint}". הוא עשוי לכלול את שמות הזוג בכתיב הנכון. אם כתב היד ניתן לקריאה בכמה אופנים והשם בשם הקובץ מתאים לאחת הקריאות - העדף את הכתיב משם הקובץ. אם השם בשם הקובץ אינו מתאים לכתב היד, התעלם ממנו.`;
}

export async function extractContractFromPdf(buffer: Buffer, fileName: string | null = null): Promise<ContractImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  const ai = new GoogleGenAI({ apiKey });
  const startedAt = Date.now();
  let rawText: string | undefined;
  let lastError: unknown;

  for (const attempt of EXTRACTION_ATTEMPTS) {
    if (Date.now() - startedAt + attempt.delayMsBefore >= EXTRACTION_BUDGET_MS) break;
    if (attempt.delayMsBefore > 0) await sleep(attempt.delayMsBefore);

    const remaining = EXTRACTION_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: [
          {
            role: "user",
            parts: [{ text: promptFor(fileName) }, { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
          abortSignal: AbortSignal.timeout(Math.min(PER_CALL_TIMEOUT_MS, remaining)),
        },
      });
      rawText = response.text;
      break;
    } catch (err) {
      lastError = err;
      if (!isTransientOverload(err)) break;
    }
  }

  if (rawText === undefined) {
    // Never let Gemini's own (raw, English, JSON-shaped) error reach the UI.
    if (lastError !== undefined) console.error("Contract extraction failed:", lastError);
    throw new Error("שירות זיהוי המסמכים עמוס כרגע - נסו שוב בעוד רגע.");
  }
  if (!rawText) throw new Error("לא התקבלה תשובה מ-Gemini");

  let extraction: ContractExtraction;
  try {
    extraction = JSON.parse(rawText) as ContractExtraction;
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }

  return buildContractDraft(extraction);
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTime(value: string | null | undefined): string | null {
  const match = clean(value)?.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

function normalizeDate(value: string | null | undefined): string | null {
  const match = clean(value)?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const valid =
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);
  return valid ? clean(value) : null;
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// A date whose day and month are both 12 or below reads two ways. The
// contract is printed DD/MM/YYYY, but the printed form can come out with the
// parts reversed (right-to-left layout flips a typed year/month/day), so the
// reading is always shown back for a check instead of silently trusted.
export function ambiguousDateWarning(iso: string | null, printed: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (m > 12 || d > 12 || m === d) return null;
  const swapped = `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
  const shown = printed ? `בחוזה מודפס ${printed}. ` : "";
  return `${shown}נקרא כ-${displayDate(iso)} (יום/חודש/שנה). אם התאריך בפועל הוא ${swapped} - תקנו אותו לפני יצירת האירוע.`;
}

// Pure step split out from the Gemini call so the normalising and the
// warnings can be unit-tested without mocking the API.
export function buildContractDraft(extraction: ContractExtraction): ContractImportDraft {
  const warnings: string[] = [];

  const first = clean(extraction.client_1_name);
  const second = clean(extraction.client_2_name);
  const name = first && second ? `${first} ו${second}` : (first ?? second ?? "");
  if (!name) warnings.push("לא זוהו שמות הלקוחות - מלאו אותם ידנית.");

  const eventType = EVENT_TYPE_KEYS.includes(extraction.event_type as PrivateEventType)
    ? (extraction.event_type as PrivateEventType)
    : "wedding";

  const eventDate = normalizeDate(extraction.event_date);
  if (!eventDate) warnings.push("לא זוהה תאריך האירוע - בחרו אותו ידנית.");
  const dateWarning = ambiguousDateWarning(eventDate, clean(extraction.event_date_printed));
  if (dateWarning) warnings.push(dateWarning);

  const startTime = normalizeTime(extraction.start_time);
  const altTime = normalizeTime(extraction.start_time_alt);
  if (startTime && altTime && startTime !== altTime) {
    warnings.push(`בשדה שעת התחלה נכתבו שתי שעות (${startTime} / ${altTime}) - נבחרה ${startTime}, ודאו מהי השעה הנכונה.`);
  }

  const guests = clean(extraction.estimated_guests);
  const phone = (value: string | null | undefined) => {
    const cleaned = clean(value);
    return cleaned ? normalizeIsraeliPhone(cleaned) : null;
  };

  warnings.push("הפרטים נקראו מכתב יד - יש לבדוק כל שדה, במיוחד שמות, טלפונים וכתובות דוא\"ל, לפני יצירת האירוע.");

  return {
    name,
    event_type: eventType,
    event_date: eventDate,
    start_time: startTime,
    hall_name: clean(extraction.hall_name),
    estimated_guests: guests ? (guests.replace(/\D/g, "") || guests) : null,
    contact_email: clean(extraction.client_1_email)?.toLowerCase() ?? null,
    contact_email_2: clean(extraction.client_2_email)?.toLowerCase() ?? null,
    contact_phone: phone(extraction.client_1_phone),
    contact_phone_2: phone(extraction.client_2_phone),
    warnings,
  };
}
