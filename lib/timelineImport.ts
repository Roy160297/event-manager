import { GoogleGenAI, Type } from "@google/genai";

export interface TimelineImportDraft {
  label: string;
  approx_time: string | null;
  notes: string | null;
}

interface GeminiTimelineStep {
  label: string;
  approx_time: string | null;
  notes: string | null;
}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      approx_time: {
        type: Type.STRING,
        nullable: true,
        description:
          'שעה משוערת בפורמט HH:MM. אם השורה מציגה טווח שעות (למשל "23:00-23:30"), החזר כאן רק את שעת ההתחלה.',
      },
      label: {
        type: Type.STRING,
        description:
          "כל הטקסט שאחרי השעה באותה שורה, בדיוק כפי שהוא מופיע (כולל פסיקים בין כמה פעילויות) - אל תפצל שורה אחת למספר פריטים.",
      },
      notes: {
        type: Type.STRING,
        nullable: true,
        description:
          'אם השורה הציגה טווח שעות, רשום כאן את שעת הסיום בפורמט "עד HH:MM". אחרת השאר null.',
      },
    },
    required: ["label"],
  },
};

const PROMPT = `זהו צילום מסך של לוח זמנים/סד"פ לאירוע (למשל הודעת וואטסאפ) - כל שורה מתחילה בשעה ואחריה תיאור של פעילות אחת או יותר, לרוב מופרדות בפסיקים. חלץ כל שורה כפריט נפרד ברשימה, לפי סדר הופעתן בתמונה, והחזר JSON בלבד לפי הסכמה שסופקה.

הנחיות חשובות:
- כל שורה בתמונה = פריט אחד ב-JSON בלבד - אל תפצל שורה בודדת עם כמה פעילויות מופרדות בפסיקים למספר פריטים, ואל תאחד שתי שורות שונות לפריט אחד.
- שדה label יכיל את כל הטקסט שאחרי השעה כפי שהוא, כולל הפסיקים שבתוכו.
- אם שורה מציגה טווח שעות (למשל "23:00-23:30 סיום משוער") - שדה approx_time יכיל רק את שעת ההתחלה, ושדה notes יכיל "עד" ואת שעת הסיום.
- התעלם משורות שאינן פריט לוח זמנים בפועל (כותרת הודעה, שם קבוצה, "הועברה", חתימה וכדומה). בפרט, אם זהו צילום מסך של הודעת וואטסאפ - יש להתעלם משעת השליחה הקטנה שמוצגת בפינת ההודעה (לרוב באפור, ליד סימוני הקריאה) ולא לפרש אותה כפריט לוח זמנים.
- אל תמציא שורות או שעות שאינן מופיעות בבירור בתמונה - אם שורה מסוימת חסרת שעה, החזר null עבור approx_time אך עדיין כלול אותה.`;

export async function extractTimelineFromImage(buffer: Buffer, mimeType: string): Promise<TimelineImportDraft[]> {
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
      temperature: 0,
    },
  });

  const rawText = response.text;
  if (!rawText) throw new Error("לא התקבלה תשובה מ-Gemini");

  let extraction: GeminiTimelineStep[];
  try {
    extraction = JSON.parse(rawText) as GeminiTimelineStep[];
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }

  return extraction
    .map((step) => ({
      label: step.label?.trim() || "",
      approx_time: step.approx_time?.trim() || null,
      notes: step.notes?.trim() || null,
    }))
    .filter((step) => step.label);
}
