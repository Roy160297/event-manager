import { buildImageImportDraft, type GeminiExtraction, type ImageImportDraft } from "@/lib/imageImport";
import { isFriday } from "@/lib/scheduleTime";

// What the browser extension sends for one iPlan event: the same fields the
// screenshot import reads off iPlan's event screen (GeminiExtraction), just
// read directly from the page instead of from an image, so the guest-count
// rules (meal types, reserve percentage) stay in one place.
export interface IplanEventPayload {
  iplan_event_id: string;
  // Closed/committed in iPlan. Open leads and drafts are ignored.
  confirmed: boolean;
  extraction: GeminiExtraction;
  floor_manager_name?: string | null;
}

// The part of an event that iPlan owns - stored per event as the last value
// seen in iPlan, so only fields that changed in iPlan are written back.
export type IplanSnapshot = Pick<
  ImageImportDraft,
  | "name"
  | "bride_name"
  | "groom_name"
  | "event_type"
  | "event_date"
  | "start_time"
  | "end_time"
  | "event_manager_name"
  | "sales_person_name"
  | "service_style"
  | "contact_phone"
  | "contact_phone_2"
  | "contact_email"
  | "contact_email_2"
  | "estimated_guests"
  | "kids_meal_count"
  | "glat_meal_count"
  | "vegetarian_meal_count"
  | "vegan_meal_count"
  | "gluten_free_meal_count"
  | "toddlers_under_2_count"
> & { floor_manager_name: string | null };

export interface FieldChange {
  field: keyof IplanSnapshot;
  label: string;
  from: string | null;
  to: string | null;
}

const FIELD_LABELS: Record<keyof IplanSnapshot, string> = {
  name: "שם הלקוח",
  bride_name: "שם הכלה",
  groom_name: "שם החתן",
  event_type: "סוג האירוע",
  event_date: "תאריך",
  start_time: "שעת התחלה",
  end_time: "שעת סיום",
  event_manager_name: "מנהל האירוע",
  floor_manager_name: "מנהל הפלור",
  sales_person_name: "איש המכירות",
  service_style: "סגנון הגשה",
  contact_phone: "טלפון",
  contact_phone_2: "טלפון נוסף",
  contact_email: "אימייל",
  contact_email_2: "אימייל נוסף",
  estimated_guests: "מספר אורחים - התחייבות",
  kids_meal_count: "מנות ילדים",
  glat_meal_count: "מנות גלאט",
  vegetarian_meal_count: "מנות צמחוניות",
  vegan_meal_count: "מנות טבעוניות",
  gluten_free_meal_count: "מנות ללא גלוטן",
  toddlers_under_2_count: "פעוטות עד גיל 2",
};

const SNAPSHOT_FIELDS = Object.keys(FIELD_LABELS) as (keyof IplanSnapshot)[];

export function snapshotFromPayload(payload: IplanEventPayload): IplanSnapshot {
  const draft = buildImageImportDraft(payload.extraction);
  const snapshot = { floor_manager_name: payload.floor_manager_name?.trim() || null } as IplanSnapshot;
  for (const field of SNAPSHOT_FIELDS) {
    if (field === "floor_manager_name") continue;
    (snapshot as unknown as Record<string, unknown>)[field] = draft[field as keyof ImageImportDraft];
  }
  return snapshot;
}

// A field iPlan returned empty keeps its previous value: an unreadable page
// or a half-loaded screen must never blank out data here.
export function mergeSnapshot(previous: IplanSnapshot | null, next: IplanSnapshot): IplanSnapshot {
  if (!previous) return next;
  const merged = { ...next } as Record<string, unknown>;
  for (const field of SNAPSHOT_FIELDS) {
    if (normalize(next[field]) === "" && normalize(previous[field]) !== "") merged[field] = previous[field];
  }
  return merged as unknown as IplanSnapshot;
}

function normalize(value: unknown): string {
  if (value == null) return "";
  // "19:30:00" (database) and "19:30" (iPlan) are the same time.
  return String(value)
    .trim()
    .replace(/^(\d{2}:\d{2}):00$/, "$1");
}

// Fields whose value differs between what iPlan showed last time and now. A
// first-ever snapshot has nothing to compare with, so it reports no changes.
export function diffSnapshots(previous: IplanSnapshot | null, next: IplanSnapshot): FieldChange[] {
  if (!previous) return [];
  const changes: FieldChange[] = [];
  for (const field of SNAPSHOT_FIELDS) {
    const before = normalize(previous[field]);
    const after = normalize(next[field]);
    if (before === after) continue;
    changes.push({ field, label: FIELD_LABELS[field], from: before || null, to: after || null });
  }
  return changes;
}

export function describeChanges(changes: FieldChange[]): string {
  return changes.map((change) => `${change.label}: ${change.from ?? "ריק"} ← ${change.to ?? "ריק"}`).join(" · ");
}

export interface StaffMatch {
  id: string;
  name: string;
}

// iPlan writes full names ("אווה בוגדשובה") where the staff list here may hold
// only part of one ("אווה"): an exact match wins, otherwise a staff name that
// is the leading words of the iPlan name (or the reverse) if exactly one fits.
export function matchStaffByName(staff: StaffMatch[], name: string | null): string | null {
  const wanted = name?.trim().toLowerCase().replace(/\s+/g, " ");
  if (!wanted) return null;
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const exact = staff.find((member) => norm(member.name) === wanted);
  if (exact) return exact.id;
  const partial = staff.filter((member) => {
    const candidate = norm(member.name);
    return candidate && (wanted.startsWith(`${candidate} `) || candidate.startsWith(`${wanted} `));
  });
  return partial.length === 1 ? partial[0].id : null;
}

// Event columns to write for the fields that changed in iPlan. A staff name
// that matches nobody here leaves that assignment as it was (and says so).
export function eventUpdateForChanges(
  changes: FieldChange[],
  next: IplanSnapshot,
  staff: StaffMatch[],
): { update: Record<string, unknown>; warnings: string[] } {
  const update: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const { field } of changes) {
    switch (field) {
      case "event_manager_name":
      case "floor_manager_name":
      case "sales_person_name": {
        const column =
          field === "event_manager_name" ? "manager_id" : field === "floor_manager_name" ? "floor_manager_id" : "sales_person_id";
        const matched = matchStaffByName(staff, next[field]);
        if (matched) update[column] = matched;
        else if (next[field]) warnings.push(`"${next[field]}" (${FIELD_LABELS[field]}) לא נמצא ברשימת הצוות`);
        else update[column] = null;
        if (field === "sales_person_name") update.sales_person_name = next.sales_person_name;
        break;
      }
      default:
        update[field] = next[field] ?? null;
    }
  }
  return { update, warnings };
}

// Mirrors the screenshot import's event creation: same start/end fallbacks.
export function eventInsertFromSnapshot(snapshot: IplanSnapshot, staff: StaffMatch[]): Record<string, unknown> {
  return {
    name: snapshot.name,
    event_type: snapshot.event_type,
    event_date: snapshot.event_date,
    start_time: snapshot.start_time || (isFriday(snapshot.event_date) ? "12:00" : "19:30"),
    end_time: snapshot.end_time || "03:00",
    manager_id: matchStaffByName(staff, snapshot.event_manager_name),
    floor_manager_id: matchStaffByName(staff, snapshot.floor_manager_name),
    sales_person_id: matchStaffByName(staff, snapshot.sales_person_name),
    sales_person_name: snapshot.sales_person_name,
    estimated_guests: snapshot.estimated_guests,
    kids_meal_count: snapshot.kids_meal_count,
    glat_meal_count: snapshot.glat_meal_count,
    vegetarian_meal_count: snapshot.vegetarian_meal_count,
    vegan_meal_count: snapshot.vegan_meal_count,
    gluten_free_meal_count: snapshot.gluten_free_meal_count,
    toddlers_under_2_count: snapshot.toddlers_under_2_count,
    bride_name: snapshot.bride_name,
    groom_name: snapshot.groom_name,
    service_style: snapshot.service_style,
    contact_phone: snapshot.contact_phone,
    contact_phone_2: snapshot.contact_phone_2,
    contact_email: snapshot.contact_email,
    contact_email_2: snapshot.contact_email_2,
  };
}

// Basic shape check for what arrives over the network.
export function isIplanEventPayload(value: unknown): value is IplanEventPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.iplan_event_id === "string" &&
    v.iplan_event_id.length > 0 &&
    typeof v.confirmed === "boolean" &&
    !!v.extraction &&
    typeof v.extraction === "object"
  );
}
