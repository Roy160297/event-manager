import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportFieldType = "text" | "number" | "time" | "longtext" | "floor_manager";

export const REPORT_FIELD_TYPE_LABELS: Record<ReportFieldType, string> = {
  text: "טקסט קצר",
  number: "מספר",
  time: "שעה",
  longtext: "טקסט ארוך (תיבה גדולה)",
  floor_manager: "מנהל הפלור של האירוע (אוטומטי)",
};

// One line of the event summary report as the venue defined it (see the
// report_fields table). Values are kept per event in events.report_values.
export interface ReportField {
  key: string;
  label: string;
  type: ReportFieldType;
  defaultValue: string | null;
  // Long texts only: also listed on the "notes and summaries" page.
  showInNotes: boolean;
  // When set, a photo can be attached next to the field (this is its slot).
  photoSlot: string | null;
  sortOrder: number;
}

interface FieldRow {
  key: string;
  label: string;
  field_type: ReportFieldType;
  default_value: string | null;
  show_in_notes: boolean;
  photo_slot: string | null;
  sort_order: number;
}

export type ReportValues = Record<string, string | undefined>;

// The key of the field the header block also uses for "event end time".
export const REPORT_END_TIME_KEY = "report_end_time";

export function assembleReportFields(rows: FieldRow[]): ReportField[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      key: row.key,
      label: row.label,
      type: row.field_type,
      defaultValue: row.default_value,
      showInNotes: row.show_in_notes,
      photoSlot: row.photo_slot,
      sortOrder: row.sort_order,
    }));
}

export async function loadReportFields(supabase: SupabaseClient): Promise<ReportField[]> {
  const { data, error } = await supabase
    .from("report_fields")
    .select("key, label, field_type, default_value, show_in_notes, photo_slot, sort_order");
  if (error) throw new Error(error.message);
  return assembleReportFields(data as FieldRow[]);
}

// Fields shown as short boxes in a grid, then the long ones as wide text areas
// below - each group keeping the venue's order.
export const shortFields = (fields: ReportField[]) => fields.filter((field) => field.type !== "longtext");
export const longFields = (fields: ReportField[]) => fields.filter((field) => field.type === "longtext");

// What an input in the report form is called. Prefixed so a field key can never
// collide with another form field.
export const reportInputName = (key: string) => `rf_${key}`;

// The values to save: the event's existing ones, with every editable field
// replaced by what the form sent (blank clears it). Values of fields that no
// longer exist, and derived fields, are left as they are.
export function mergeReportValues(fields: ReportField[], existing: ReportValues, formData: FormData): ReportValues {
  const merged: ReportValues = { ...existing };
  for (const field of fields) {
    if (field.type === "floor_manager") continue;
    const raw = formData.get(reportInputName(field.key));
    if (raw === null) continue;
    const value = String(raw).trim();
    if (value) merged[field.key] = value;
    else delete merged[field.key];
  }
  return merged;
}

// What a field shows read-only (and in print): the saved value, the event's
// floor manager for the derived field, otherwise nothing.
export function displayValue(field: ReportField, values: ReportValues, floorManagerName: string | null): string | null {
  if (field.type === "floor_manager") return floorManagerName;
  return values[field.key]?.trim() || null;
}

// A new field's key: stable, unique among the existing ones, never reused.
export function newFieldKey(): string {
  return `f_${Math.random().toString(16).slice(2, 10)}`;
}
