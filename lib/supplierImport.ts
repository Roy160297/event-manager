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

// Same as lib/imageImport.ts's isTransientOverload - moves on to the next
// attempt in the ladder rather than aborting for either a transient 503
// "high demand" overload, or a 429 RESOURCE_EXHAUSTED (a model-specific
// rate/quota limit): both mean THIS tier is unavailable right now, not that
// the whole extraction should fail. Confirmed live that treating only 503s
// this way was a real bug - a single 429 was throwing immediately and
// skipping every other (untried) attempt in the ladder.
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

// lite first (fast, and separate capacity from the flash tier), falling
// back to the slower/more-reliable flash tier if lite itself is overloaded -
// same round-robin retry as lib/imageImport.ts, which fixed the identical
// "slow, and occasionally fails outright under Gemini load" symptom there. A
// third (pinned, non-"-latest") tier was tried here too, but dropped after
// confirming live that the newest pinned models carry a much harsher
// free-tier daily quota (20 requests/day) than these two aliases - it
// exhausted almost immediately under real use and added no resilience.

const PRIMARY_MODEL = "gemini-flash-lite-latest";
const FALLBACK_MODEL = "gemini-flash-latest";

// Round-robins between both tiers before ever repeating one, three full
// passes - see lib/imageImport.ts's EXTRACTION_ATTEMPTS comment: retrying
// the same tier twice in a row wastes a slot when it's under sustained load
// rather than a momentary blip, and Gemini has been confirmed live to put
// both tiers into simultaneous 503s during a real platform-wide spike -
// several fast passes raise the odds of landing in a recovery window.
const EXTRACTION_ATTEMPTS: { model: string; delayMsBefore: number }[] = [
  { model: PRIMARY_MODEL, delayMsBefore: 0 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
  { model: PRIMARY_MODEL, delayMsBefore: 500 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
  { model: PRIMARY_MODEL, delayMsBefore: 700 },
  { model: FALLBACK_MODEL, delayMsBefore: 300 },
];

// Caps the whole retry loop's wall-clock time well under the hosting page's
// maxDuration (60s - see app/events/[id]/page.tsx), so a stuck call always
// fails fast into the friendly "busy" message below instead of Vercel
// hard-killing the function mid-response (which surfaces to the browser as a
// bare "Failed to fetch" instead of a real error).
const EXTRACTION_BUDGET_MS = 20_000;
const PER_CALL_TIMEOUT_MS = 10_000;

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
      // See lib/imageImport.ts's identical comment: a non-transient error
      // won't behave differently on the next tier, so stop here rather than
      // burn more attempts - but still fall through to the friendly message
      // below instead of throwing the raw error directly.
      if (!isTransientOverload(err)) break;
    }
  }

  if (rawText === undefined) {
    // Never let Gemini's own error (raw, English, often JSON-shaped) reach
    // the UI - always the one friendly Hebrew message, with the real cause
    // logged server-side for debugging.
    if (lastError !== undefined) console.error("Supplier extraction failed:", lastError);
    throw new Error("שירות זיהוי התמונה עמוס כרגע - נסו שוב בעוד רגע.");
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
