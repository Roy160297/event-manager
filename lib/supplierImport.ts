import { GoogleGenAI, Type } from "@google/genai";

export interface SupplierImportDraft {
  role: string | null;
  name: string;
  phone: string | null;
}

interface GeminiSupplier {
  role: string | null;
  name: string;
  phone: string | null;
}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      role: { type: Type.STRING, nullable: true, description: "תפקיד/סוג הספק, למשל \"צלם וידיאו\" או \"דיג'יי\"" },
      name: { type: Type.STRING, description: "שם הספק בלבד" },
      phone: { type: Type.STRING, nullable: true, description: "מספר טלפון של הספק, אם מופיע" },
    },
    required: ["name"],
  },
};

const PROMPT = `זהו צילום מסך של הודעה (למשל וואטסאפ) או רשימה חופשית של ספקים לאירוע. חלץ ממנה רשימת ספקים והחזר JSON בלבד לפי הסכמה שסופקה - מערך אובייקטים, אחד לכל ספק.

הנחיות חשובות:
- כל שורה בדרך כלל בפורמט "תפקיד- שם- טלפון" (המפרידים יכולים להיות "-" או "|" או רווח), לעיתים עם "#" בתחילת השורה - ה-# הוא רק סימון ולא חלק מהתפקיד.
- התעלם משורות שאינן ספק בפועל (כותרות, ברכות, הקדמות כמו "מצרפת רשימת ספקים").
- אם לא ניתן לזהות תפקיד ברור לספק מסוים, החזר null עבור role, אך עדיין כלול את הספק.
- אם שם הספק כולל גם פרטים נוספים בסוגריים (למשל שם חברה), אפשר לכלול אותם כחלק מהשם.
- אל תמציא מספרי טלפון או שמות שאינם מופיעים בבירור בתמונה.`;

export async function extractSuppliersFromImage(buffer: Buffer, mimeType: string): Promise<SupplierImportDraft[]> {
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

  let extraction: GeminiSupplier[];
  try {
    extraction = JSON.parse(rawText) as GeminiSupplier[];
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }

  return extraction
    .map((supplier) => ({
      role: supplier.role?.trim() || null,
      name: supplier.name?.trim() || "",
      phone: supplier.phone?.trim() || null,
    }))
    .filter((supplier) => supplier.name);
}
