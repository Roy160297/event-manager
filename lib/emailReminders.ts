import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDate } from "@/lib/coupleMeetingReminders";
import { hasDjTzachZivSupplier } from "@/lib/djSketchReminder";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EmailReminderCondition, EmailReminderRuleRow, EventType } from "@/lib/types";

// The event fields a reminder's due date, condition or text can draw on.
export interface EmailReminderEvent {
  id?: string;
  name: string;
  event_type: EventType;
  event_date: string;
  couple_meeting_date: string | null;
  estimated_guests: string | null;
  kids_meal_count: string | null;
  glat_meal_count: string | null;
  vegetarian_meal_count: string | null;
  vegan_meal_count: string | null;
  gluten_free_meal_count: string | null;
  toddlers_under_2_count: string | null;
  menu_notes: string | null;
}

export const CONDITION_LABELS: Record<EmailReminderCondition, string> = {
  none: "ללא תנאי",
  additional_info_filled: "רק אם מולא מידע נוסף באירוע",
  supplier_dj_tzach_ziv: "רק אם הדיג'י באירוע הוא צח זיו",
};

// {placeholder} -> description, shown as help on the management page.
export const EMAIL_PLACEHOLDERS: Record<string, string> = {
  event_name: "שם האירוע",
  event_type: "סוג האירוע",
  event_date: "תאריך האירוע",
  guests: "מספר אורחים - התחייבות",
  kids_meal_count: "מנות ילדים",
  glat_meal_count: "מנות גלאט",
  vegetarian_meal_count: "מנות צמחוניות",
  vegan_meal_count: "מנות טבעוניות",
  gluten_free_meal_count: "מנות ללא גלוטן",
  toddlers_under_2_count: "ילדים מתחת לגיל 2",
  additional_info: "מידע נוסף",
};

const dash = (value: string | null) => value || "—";

export function emailPlaceholderValues(event: EmailReminderEvent): Record<string, string> {
  return {
    event_name: event.name,
    event_type: EVENT_TYPE_LABELS[event.event_type],
    event_date: formatDate(event.event_date),
    guests: dash(event.estimated_guests),
    kids_meal_count: dash(event.kids_meal_count),
    glat_meal_count: dash(event.glat_meal_count),
    vegetarian_meal_count: dash(event.vegetarian_meal_count),
    vegan_meal_count: dash(event.vegan_meal_count),
    gluten_free_meal_count: dash(event.gluten_free_meal_count),
    toddlers_under_2_count: dash(event.toddlers_under_2_count),
    additional_info: event.menu_notes?.trim() ?? "",
  };
}

function replacePlaceholders(template: string, values: Record<string, string>, wrap: (key: string, value: string) => string, literal: (text: string) => string) {
  let out = "";
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    out += literal(template.slice(last, match.index));
    out += match[1] in values ? wrap(match[1], values[match[1]]) : literal(match[0]);
    last = match.index + match[0].length;
  }
  return out + literal(template.slice(last));
}

export function renderEmailSubject(template: string, event: EmailReminderEvent): string {
  return replacePlaceholders(template, emailPlaceholderValues(event), (_key, value) => value, (text) => text);
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The template is plain text: everything is HTML-escaped, the event name is
// bolded, and line breaks (including inside the additional-info value) become
// <br/>.
export function renderEmailBody(template: string, event: EmailReminderEvent): string {
  const html = replacePlaceholders(
    template,
    emailPlaceholderValues(event),
    (key, value) => (key === "event_name" ? `<strong>${escapeHtml(value)}</strong>` : escapeHtml(value)),
    escapeHtml,
  );
  return html.replace(/\r?\n/g, "<br/>");
}

// The single day a rule is due for this event, or null when it can't be
// computed (e.g. anchored on the couple meeting with no date and no fallback).
export function resolveEmailTargetDate(
  rule: Pick<EmailReminderRuleRow, "anchor" | "offset_days" | "fallback_offset_days">,
  event: Pick<EmailReminderEvent, "event_date" | "couple_meeting_date">,
): string | null {
  if (rule.anchor === "event_date") return addDaysToDate(event.event_date, rule.offset_days);
  if (event.couple_meeting_date) return addDaysToDate(event.couple_meeting_date, rule.offset_days);
  if (rule.fallback_offset_days !== null) return addDaysToDate(event.event_date, rule.fallback_offset_days);
  return null;
}

export async function isEmailRuleConditionMet(
  rule: Pick<EmailReminderRuleRow, "condition">,
  event: Pick<EmailReminderEvent, "id" | "menu_notes">,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (rule.condition === "additional_info_filled") return !!event.menu_notes?.trim();
  if (rule.condition === "supplier_dj_tzach_ziv") return !!event.id && (await hasDjTzachZivSupplier(supabase, event.id));
  return true;
}

export function splitEmails(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export interface StaffDirectoryEntry {
  id: string;
  email: string | null;
  role_id: string | null;
}

export async function loadStaffDirectory(supabase: SupabaseClient): Promise<StaffDirectoryEntry[]> {
  const { data, error } = await supabase.from("staff").select("id, email, role_id").returns<StaffDirectoryEntry[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Everyone a rule should email for this event: the roles of the event itself
// (manager / floor manager / salesperson), every member of the chosen roles,
// the chosen staff members and any typed-in addresses - de-duplicated.
export function emailRuleRecipients(
  rule: Pick<
    EmailReminderRuleRow,
    "to_event_manager" | "to_floor_manager" | "to_salesperson" | "recipient_role_ids" | "recipient_staff_ids" | "extra_emails"
  >,
  event: { manager_id: string | null; floor_manager_id: string | null; sales_person_id: string | null },
  directory: StaffDirectoryEntry[],
): string[] {
  const emailOf = (staffId: string | null) => directory.find((member) => member.id === staffId)?.email ?? null;
  const recipients: (string | null)[] = [...splitEmails(rule.extra_emails)];
  if (rule.to_event_manager) recipients.push(emailOf(event.manager_id));
  if (rule.to_floor_manager) recipients.push(emailOf(event.floor_manager_id));
  if (rule.to_salesperson) recipients.push(emailOf(event.sales_person_id));
  for (const member of directory) {
    if (rule.recipient_staff_ids.includes(member.id)) recipients.push(member.email);
    if (member.role_id && rule.recipient_role_ids.includes(member.role_id)) recipients.push(member.email);
  }
  // One email per person, however they were reached (e.g. as the floor manager
  // and also typed in as an extra address) - compared case-insensitively.
  const unique = new Map<string, string>();
  for (const email of recipients) {
    if (email && !unique.has(email.trim().toLowerCase())) unique.set(email.trim().toLowerCase(), email.trim());
  }
  return [...unique.values()];
}

export async function loadActiveEmailReminderRules(supabase: SupabaseClient): Promise<EmailReminderRuleRow[]> {
  const { data, error } = await supabase
    .from("email_reminder_rules")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .returns<EmailReminderRuleRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
