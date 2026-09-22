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

// Gemini sometimes reads a phone number in its international form off the
// photo (e.g. a contact card showing "+972 52-123-4567") - convert that back
// to the local "0" prefix suppliers are otherwise stored with.
export function normalizeIsraeliPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+972") || (digits.startsWith("972") && digits.length > 9)) {
    return "0" + digits.slice(3);
  }
  return trimmed;
}

const PROMPT = `זהו צילום מסך של הודעה (למשל וואטסאפ) או רשימה חופשית של ספקים לאירוע. חלץ ממנה רשימת ספקים והחזר JSON בלבד לפי הסכמה שסופקה - מערך אובייקטים, אחד לכל ספק.

הנחיות חשובות:
- כל שורה בדרך כלל בפורמט "תפקיד- שם- טלפון" (המפרידים יכולים להיות "-" או "|" או רווח), לעיתים עם "#" בתחילת השורה - ה-# הוא רק סימון ולא חלק מהתפקיד.
- התעלם משורות שאינן ספק בפועל (כותרות, ברכות, הקדמות כמו "מצרפת רשימת ספקים").
- אם לא ניתן לזהות תפקיד ברור לספק מסוים, החזר null עבור role, אך עדיין כלול את הספק.
- אם שם הספק כולל גם פרטים נוספים בסוגריים (למשל שם חברה), אפשר לכלול אותם כחלק מהשם.
- אל תמציא מספרי טלפון או שמות שאינם מופיעים בבירור בתמונה.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same transient-503-detection as lib/imageImport.ts - a "high demand"
// overload from Gemini clears within a second or two most of the time.
function isTransientOverload(err: unknown): boolean {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("UNAVAILABLE") || message.includes("high demand") || message.includes('"code":503');
}

// lite first (fast, and separate capacity from the flash tier), falling
// back to the slower/more-reliable flash tier if lite itself is overloaded -
// same two-tier retry as lib/imageImport.ts, which fixed the identical
// "slow, and occasionally fails outright under Gemini load" symptom there.
const PRIMARY_MODEL = "gemini-flash-lite-latest";
const FALLBACK_MODEL = "gemini-flash-latest";

const EXTRACTION_ATTEMPTS: { model: string; delayMsBefore: number }[] = [
  { model: PRIMARY_MODEL, delayMsBefore: 0 },
  { model: PRIMARY_MODEL, delayMsBefore: 1000 },
  { model: FALLBACK_MODEL, delayMsBefore: 1500 },
];

// Caps the whole retry loop's wall-clock time well under the hosting page's
// maxDuration (60s - see app/events/[id]/page.tsx), so a stuck call always
// fails fast into the friendly "busy" message below instead of Vercel
// hard-killing the function mid-response (which surfaces to the browser as a
// bare "Failed to fetch" instead of a real error).
const EXTRACTION_BUDGET_MS = 30_000;
const PER_CALL_TIMEOUT_MS = 15_000;

export async function extractSuppliersFromImage(buffer: Buffer, mimeType: string): Promise<SupplierImportDraft[]> {
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
            parts: [{ text: PROMPT }, { inlineData: { mimeType, data: buffer.toString("base64") } }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          abortSignal: AbortSignal.timeout(Math.min(PER_CALL_TIMEOUT_MS, remaining)),
        },
      });
      rawText = response.text;
      break;
    } catch (err) {
      lastError = err;
      if (!isTransientOverload(err)) throw err;
    }
  }

  if (rawText === undefined) {
    if (lastError === undefined || isTransientOverload(lastError)) {
      throw new Error("שירות זיהוי התמונה עמוס כרגע - נסו שוב בעוד רגע.");
    }
    throw lastError;
  }
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
      phone: supplier.phone?.trim() ? normalizeIsraeliPhone(supplier.phone) : null,
    }))
    .filter((supplier) => supplier.name);
}
