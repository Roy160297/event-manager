import mammoth from "mammoth";
import { GoogleGenAI, Type } from "@google/genai";
import type { MenuSection, MenuType } from "@/lib/types";

export interface MenuImportDraft {
  menu_type: MenuType;
  title: string | null;
  subtitle: string | null;
  linens_note: string | null;
  sections: MenuSection[];
  footer_notes: string[];
  warnings: string[];
}

interface GeminiMenuExtraction {
  menu_type: MenuType;
  title: string | null;
  subtitle: string | null;
  linens_note: string | null;
  sections: { label: string; note: string | null; items: string[] }[];
  footer_notes: string[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    menu_type: {
      type: Type.STRING,
      enum: ["buffet", "plated"],
      description: '"plated" עבור תפריט הגשה (מנות בודדות לכל אורח), "buffet" עבור תפריט מזנונים/עמדות - זו גם ברירת המחדל',
    },
    title: { type: Type.STRING, nullable: true, description: "כותרת התפריט (השורה הראשונה במסמך)" },
    subtitle: { type: Type.STRING, nullable: true, description: "תת-כותרת התפריט (השורה השנייה, בדרך כלל עם תיאור ותאריך)" },
    linens_note: { type: Type.STRING, nullable: true, description: "שורה קצרה על צבעי מפות/מפיות, אם מופיעה" },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "כותרת הסעיף/העמדה" },
          note: {
            type: Type.STRING,
            nullable: true,
            description: 'הערת בחירה/הסבר בסוגריים הצמודה לכותרת הסעיף (למשל "2 עמדות לבחירה"), אם קיימת',
          },
          items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "רשימת המנות בסעיף" },
        },
        required: ["label", "items"],
      },
    },
    footer_notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'שורות ההערה המנוקדות בתחילתן (•) בסוף המסמך, ללא תו הבולט עצמו',
    },
  },
  required: ["menu_type", "sections", "footer_notes"],
};

const PROMPT = `להלן טקסט גולמי שחולץ ממסמך Word המכיל תפריט טעימות לאירוע (חתונה/אירוע) באולם אירועים. פרק את הטקסט למבנה JSON לפי הסכמה שסופקה.

הנחיות:
- שתי השורות הראשונות הן בדרך כלל כותרת התפריט (title) ותת-כותרת עם תיאור ותאריך (subtitle) - חלץ אותן בנפרד, לא כחלק מהסעיפים.
- שורה קצרה בתחילת המסמך על צבעי מפות/מפיות שייכת לשדה linens_note בלבד, ולא לסעיף - אך חלץ רק את הצבע/ים עצמם, בלי לחזור על המילים "מפות"/"מפיות" כשהן רק חוזרות על השדה עצמו (השדה כבר מתויג ככה בממשק). לדוגמה: "מפות ומפיות:לבן / שמנת / שחור" -> "לבן / שמנת / שחור". אם צבע המפות שונה מצבע המפיות, שמור על ההבחנה בין השניים, לדוגמה: "מפות: לבן ומפיות: שמנת" -> "לבן, מפיות: שמנת".
- מכאן והלאה, המסמך מחולק לסעיפים (למשל "דגים נאים", "בשר נא & טאקו", "ארוחת ערב", "על השולחן", "ירק ואנטיפסטי", "מטבח אש וגריל", "קינוחים", "עמדת לייט נייט" וכדומה) - כל שורה קצרה שמופיעה בפני עצמה ומשמשת ככותרת לקבוצת מנות שאחריה היא כותרת סעיף (label). המנות שאחריה ועד לכותרת הסעיף הבא הן ה-items של אותו סעיף.
- לעיתים כותרת (כמו "הגינה שלנו" או "ארוחת ערב") היא כותרת-על שאינה מלווה במנות כלשהן, אלא ישירות בכותרת סעיף נוספת (למשל "הגינה שלנו" ומיד אחריה "דגים נאים", או "ארוחת ערב" ומיד אחריה "על השולחן:") - במקרה כזה הכותרת-על עצמה היא סעיף נפרד משלה עם items ריק (אלא אם כן יש לצידה הערה בסוגריים - ראה סעיף הבא), וכל כותרת שאחריה (כמו "דגים נאים" או "על השולחן") היא סעיף מלא ונפרד בפני עצמו, ולא חלק מהכותרת-על. אל תמזג את שתי הכותרות לכדי label אחד (למשל אסור "ארוחת ערב - על השולחן"), ואל תכניס את הכותרת השנייה (כמו "על השולחן:") כפריט בתוך הכותרת-על.
- לעיתים מיד אחרי כותרת הסעיף (או בתוכה) מופיעה הערה בסוגריים המתארת כמות בחירה או הסבר (למשל "( 2 עמדות לבחירה )", "(1 לבחירה)", "(סלט עלים עם פרי עונתי ושאלוט מוחמץ ובנוסף 4 אופציות לבחירה בהתאם לעונה)") - זו הערת הסעיף (note), לא מנה בפני עצמה - אל תכלול אותה ב-items.
- שמות "עמדות" (למשל "עמדת מחבת ברזל יצוקה (1 לבחירה)") הם גם הם כותרות סעיף לכל דבר - השם עצמו (ללא חלק הסוגריים) הוא ה-label, וחלק הסוגריים הוא ה-note.
- כל מנה היא בדרך כלל שורה/פסקה נפרדת. שים לב: לעיתים שתי מנות שונות מופיעות ללא רווח ביניהן באותה פסקה (תוצאה של פריסת עמודות שאבדה בהמרת המסמך) - אם פסקה אחת מכילה בבירור כמה מנות נפרדות (כל אחת עם מרכיב מוביל משלה ופסיקים פנימיים), פצל אותה למספר items נפרדים לפי שיקול דעתך; אם אינך בטוח, השאר כפריט אחד.
- שורות שמתחילות בתו נקודה/בולט (למשל "•") שמופיעות בסוף המסמך (בדרך כלל 2-3 שורות על יין, עונתיות המטבח, ומים וסודה) אינן מנות ואינן שייכות לאף סעיף - אלו footer_notes, ללא תו הבולט עצמו.
- שדה menu_type: קבע "plated" (הגשה) אם כותרת המסמך מכילה את המילה "הגשה", או אם מבנה התוכן מציג בעיקר מנות בודדות מוגשות לכל אורח (למשל מנות ראשונות/עיקריות נפרדות) ולא "עמדות" עם "X לבחירה". אחרת קבע "buffet" (מזנונים) - זו ברירת המחדל, ורוב התפריטים מבוססי "עמדות" ו"X לבחירה" הם buffet.
- אל תמציא תוכן שלא מופיע בטקסט. אם שדה כלשהו (title/subtitle/linens_note) לא נמצא בבירור, החזר null עבורו.

הטקסט:
`;

export async function extractMenuDraftFromDocx(buffer: Buffer): Promise<MenuImportDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");

  let rawText: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } catch {
    throw new Error("לא ניתן היה לקרוא את קובץ ה-Word - ודאו שמדובר בקובץ docx תקין");
  }
  if (!rawText.trim()) throw new Error("לא נמצא טקסט בקובץ שהועלה");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: [{ role: "user", parts: [{ text: PROMPT + rawText }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const responseText = response.text;
  if (!responseText) throw new Error("לא התקבלה תשובה מ-Gemini");

  let extraction: GeminiMenuExtraction;
  try {
    extraction = JSON.parse(responseText) as GeminiMenuExtraction;
  } catch {
    throw new Error("תשובת Gemini לא הייתה JSON תקין");
  }

  const warnings: string[] = [
    "הפיצול לסעיפים ולמנות בוצע אוטומטית - יש לעבור ולתקן במידת הצורך, במיוחד אם נראה שכמה מנות התחברו בטעות לפריט אחד.",
  ];

  const sections: MenuSection[] = (extraction.sections ?? [])
    .map((section) => ({
      label: section.label?.trim() || "",
      note: section.note?.trim() || null,
      items: (section.items ?? []).map((item) => item.trim()).filter(Boolean),
    }))
    .filter((section) => section.label || section.items.length > 0);

  if (sections.length === 0) {
    warnings.push("לא זוהו סעיפי תפריט בקובץ - ניתן להוסיף סעיפים ידנית בעמוד העריכה.");
  }

  return {
    menu_type: extraction.menu_type === "plated" ? "plated" : "buffet",
    title: extraction.title?.trim() || null,
    subtitle: extraction.subtitle?.trim() || null,
    linens_note: extraction.linens_note?.trim() || null,
    sections,
    footer_notes: (extraction.footer_notes ?? []).map((note) => note.trim()).filter(Boolean),
    warnings,
  };
}
