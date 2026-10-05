import { GoogleGenAI, Type } from "@google/genai";
import { EMAIL_PLACEHOLDERS } from "@/lib/emailReminders";
import type { EmailReminderAnchor, PushReminderRecipientType } from "@/lib/types";

// Free text -> a draft push notification / email reminder, for the "describe
// it in a sentence" box on the reminders page. The model only fills a draft:
// anything the sentence doesn't say comes back null and is left blank for the
// user to complete in the preview form before anything is created.

const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

async function generateDraft(prompt: string, schema: object): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY אינו מוגדר בסביבת השרת");
  const ai = new GoogleGenAI({ apiKey });

  let lastError: unknown;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0,
          abortSignal: AbortSignal.timeout(25_000),
        },
      });
      return JSON.parse(response.text ?? "{}") as Record<string, unknown>;
    } catch (err) {
      lastError = err;
    }
  }
  console.error("ruleDraft: all models failed", lastError);
  throw new Error("שירות ה-AI אינו זמין כרגע, נסו שוב בעוד רגע או מלאו ידנית");
}

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const integer = (value: unknown): number | null => (typeof value === "number" && Number.isInteger(value) ? value : null);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/* ---------------------------- push notifications ---------------------------- */

export interface PushRuleDraft {
  title: string | null;
  anchor_label: string | null;
  offset_minutes: number | null;
  notification_title: string | null;
  notification_body: string | null;
  recipient_type: PushReminderRecipientType | null;
  recipient_role_id: string | null;
  recipient_staff_id: string | null;
  missing: string[];
}

const PUSH_RECIPIENT_TYPES = ["event_manager", "floor_manager", "role", "fixed_staff"] as const;

const PUSH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, nullable: true },
    anchor_label: { type: Type.STRING, nullable: true },
    offset_minutes: { type: Type.INTEGER, nullable: true },
    notification_title: { type: Type.STRING, nullable: true },
    notification_body: { type: Type.STRING, nullable: true },
    recipient_type: { type: Type.STRING, enum: [...PUSH_RECIPIENT_TYPES], nullable: true },
    recipient_name: { type: Type.STRING, nullable: true },
  },
};

function matchByName(name: string | null, list: { id: string; name: string }[]): string | null {
  if (!name) return null;
  const wanted = name.trim().toLowerCase();
  const exact = list.find((item) => item.name.trim().toLowerCase() === wanted);
  if (exact) return exact.id;
  const partial = list.filter((item) => item.name.toLowerCase().includes(wanted) || wanted.includes(item.name.toLowerCase()));
  return partial.length === 1 ? partial[0].id : null;
}

export async function draftPushRule(
  request: string,
  context: { stepLabels: string[]; roles: { id: string; name: string }[]; staff: { id: string; name: string }[] },
): Promise<PushRuleDraft> {
  const prompt = `You turn a Hebrew request into a draft push-notification rule for an event venue's management app.
A rule sends a phone push notification a number of minutes before/after a step in an event's timeline.

Request: """${request}"""

Fill these fields (use null for anything the request does not say - never guess):
- title: short internal name for the rule, in Hebrew.
- anchor_label: the timeline step the timing is relative to. Choose the closest match from this exact list when one fits, otherwise use the user's wording: ${context.stepLabels.join(" | ")}
- offset_minutes: integer minutes; NEGATIVE = before the step, POSITIVE = after the step, 0 = at the step. "אחרי תחילת החופה" means anchor "חופה" with a positive offset.
- notification_title: short push title in Hebrew, starting with "תזכורת:".
- notification_body: the push text in Hebrew. You may use {event_name} for the event's name and {additional_info} for the event's additional-info text.
- recipient_type: event_manager (the event's manager), floor_manager (the event's floor manager), role (everyone with a role), fixed_staff (one named staff member) - only if the request says who receives it, otherwise null.
- recipient_name: for role / fixed_staff, the role or person as written. Known roles: ${context.roles.map((r) => r.name).join(", ")}. Known staff: ${context.staff.map((s) => s.name).join(", ")}.`;

  const raw = await generateDraft(prompt, PUSH_SCHEMA);
  const recipientType = oneOf(raw.recipient_type, PUSH_RECIPIENT_TYPES);
  const recipientName = text(raw.recipient_name);
  const roleId = recipientType === "role" ? matchByName(recipientName, context.roles) : null;
  const staffId = recipientType === "fixed_staff" ? matchByName(recipientName, context.staff) : null;

  const draft: PushRuleDraft = {
    title: text(raw.title),
    anchor_label: text(raw.anchor_label),
    offset_minutes: integer(raw.offset_minutes),
    notification_title: text(raw.notification_title),
    notification_body: text(raw.notification_body),
    recipient_type: recipientType,
    recipient_role_id: roleId,
    recipient_staff_id: staffId,
    missing: [],
  };
  if (!draft.title) draft.missing.push("שם פנימי");
  if (!draft.anchor_label) draft.missing.push("שלב בלוח הזמנים");
  if (draft.offset_minutes === null) draft.missing.push("הפרש דקות");
  if (!draft.notification_title) draft.missing.push("כותרת ההתראה");
  if (!draft.notification_body) draft.missing.push("תוכן ההתראה");
  if (!recipientType) draft.missing.push("נמען");
  else if (recipientType === "role" && !roleId) draft.missing.push("תפקיד");
  else if (recipientType === "fixed_staff" && !staffId) draft.missing.push("איש צוות");
  return draft;
}

/* ------------------------------ email reminders ------------------------------ */

export interface EmailRuleDraft {
  title: string | null;
  anchor: EmailReminderAnchor | null;
  offset_days: number | null;
  fallback_mode: "skip" | "event" | null;
  fallback_offset_days: number | null;
  run_window: "any" | "morning" | "evening" | null;
  to_event_manager: boolean | null;
  to_floor_manager: boolean | null;
  to_salesperson: boolean | null;
  recipient_role_ids: string[];
  recipient_staff_ids: string[];
  extra_emails: string | null;
  subject: string | null;
  body: string | null;
  missing: string[];
}

const EMAIL_ANCHORS = ["event_date", "couple_meeting_date"] as const;
const EMAIL_RUN_WINDOWS = ["any", "morning", "evening"] as const;
const EMAIL_FALLBACK_MODES = ["skip", "event"] as const;

const EMAIL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, nullable: true },
    anchor: { type: Type.STRING, enum: [...EMAIL_ANCHORS], nullable: true },
    offset_days: { type: Type.INTEGER, nullable: true },
    fallback_mode: { type: Type.STRING, enum: [...EMAIL_FALLBACK_MODES], nullable: true },
    fallback_offset_days: { type: Type.INTEGER, nullable: true },
    run_window: { type: Type.STRING, enum: [...EMAIL_RUN_WINDOWS], nullable: true },
    to_event_manager: { type: Type.BOOLEAN, nullable: true },
    to_floor_manager: { type: Type.BOOLEAN, nullable: true },
    to_salesperson: { type: Type.BOOLEAN, nullable: true },
    recipient_staff_names: { type: Type.ARRAY, items: { type: Type.STRING } },
    extra_emails: { type: Type.STRING, nullable: true },
    subject: { type: Type.STRING, nullable: true },
    body: { type: Type.STRING, nullable: true },
  },
};

export async function draftEmailRule(
  request: string,
  context: { staff: { id: string; name: string; roleName?: string | null }[] },
): Promise<EmailRuleDraft> {
  const placeholders = Object.entries(EMAIL_PLACEHOLDERS)
    .map(([key, label]) => `{${key}} = ${label}`)
    .join(", ");
  const prompt = `You turn a Hebrew request into a draft automatic email reminder for an event venue's management app.
The email is sent once per event, on a day computed from the event's date or its couple-meeting date.

Request: """${request}"""

Fill these fields (null for anything the request does not say, except where a default is given below):
- title: short internal name in Hebrew.
- anchor: "event_date" (relative to the event day) or "couple_meeting_date" (relative to the meeting with the couple).
- offset_days: integer days; NEGATIVE = before the anchor, POSITIVE = after, 0 = on the same day. "שבוע לפני" = -7.
- fallback_mode: only when anchor is couple_meeting_date - "event" if the request says what to do when no meeting date was entered, "skip" if it should not be sent without one; null for event_date anchors or if not said.
- fallback_offset_days: when fallback_mode is "event", the days relative to the EVENT date (e.g. -7); otherwise null.
- run_window: "any", "morning" or "evening". Default "any" unless the request says morning/evening.
- to_event_manager / to_floor_manager / to_salesperson: true if the request says the event's manager / the event's floor manager (מנהל פלור) / the event's salesperson (איש מכירות) receives it; otherwise null.
- recipient_staff_names: specific people who should receive it - a request that names a position (e.g. the chef) means the person holding it. Use the name exactly as in this list (name - position): ${context.staff.map((m) => (m.roleName ? `${m.name} (${m.roleName})` : m.name)).join(", ")}; [] if none.
- extra_emails: comma-separated email addresses written in the request; null if none were written.
- subject: the email subject in Hebrew. You may use placeholders.
- body: the email text in Hebrew; use real line breaks and "• " at the start of list lines. Use placeholders for event data instead of writing it out. Placeholders: ${placeholders}.`;

  const raw = await generateDraft(prompt, EMAIL_SCHEMA);
  const anchor = oneOf(raw.anchor, EMAIL_ANCHORS);
  const fallbackMode = anchor === "couple_meeting_date" ? oneOf(raw.fallback_mode, EMAIL_FALLBACK_MODES) : null;
  const fallbackOffset = fallbackMode === "event" ? integer(raw.fallback_offset_days) : null;
  const extraEmails = text(raw.extra_emails);
  const namesOf = (value: unknown) => (Array.isArray(value) ? value.map(text).filter((name): name is string => !!name) : []);
  const idsOf = (names: string[], list: { id: string; name: string }[]) =>
    [...new Set(names.map((name) => matchByName(name, list)).filter((id): id is string => !!id))];

  const draft: EmailRuleDraft = {
    title: text(raw.title),
    anchor,
    offset_days: integer(raw.offset_days),
    fallback_mode: fallbackMode,
    fallback_offset_days: fallbackOffset,
    run_window: oneOf(raw.run_window, EMAIL_RUN_WINDOWS),
    to_event_manager: raw.to_event_manager === true ? true : null,
    to_floor_manager: raw.to_floor_manager === true ? true : null,
    to_salesperson: raw.to_salesperson === true ? true : null,
    recipient_role_ids: [],
    recipient_staff_ids: idsOf(namesOf(raw.recipient_staff_names), context.staff),
    extra_emails: extraEmails,
    subject: text(raw.subject),
    body: text(raw.body),
    missing: [],
  };
  if (!draft.title) draft.missing.push("שם פנימי");
  if (!draft.anchor) draft.missing.push("נשלח ביחס ל...");
  if (draft.offset_days === null) draft.missing.push("מספר ימים");
  if (draft.anchor === "couple_meeting_date" && !draft.fallback_mode) draft.missing.push("מה לעשות אם אין תאריך פגישה");
  if (draft.fallback_mode === "event" && draft.fallback_offset_days === null) draft.missing.push("ימים ביחס לתאריך האירוע");
  if (!draft.run_window) draft.missing.push("שעת שליחה");
  const hasRecipient =
    draft.to_event_manager ||
    draft.to_floor_manager ||
    draft.to_salesperson ||
    draft.recipient_staff_ids.length > 0 ||
    !!draft.extra_emails;
  if (!hasRecipient) draft.missing.push("נמענים");
  if (!draft.subject) draft.missing.push("נושא האימייל");
  if (!draft.body) draft.missing.push("תוכן האימייל");
  return draft;
}
