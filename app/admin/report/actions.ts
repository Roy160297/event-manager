"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { REPORT_FIELD_TYPE_LABELS, newFieldKey, type ReportFieldType } from "@/lib/reportFields";

// Every action returns an error message instead of throwing (Next.js hides thrown
// Server Action messages in production), and undefined on success.
type Result = Promise<string | void>;

const DENIED = "אין הרשאה לערוך את דוח הסיכום";

async function allowed(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return !!staff && canWrite(staff.permissions, "venue_settings");
}

function refresh() {
  revalidatePath("/admin/report");
  revalidatePath("/events", "layout");
  revalidatePath("/checklist-notes");
}

const isType = (value: string): value is ReportFieldType => value in REPORT_FIELD_TYPE_LABELS;

export async function addField(formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "יש להזין שם לרובריקה";
  const type = String(formData.get("field_type") ?? "text");
  if (!isType(type)) return "סוג שדה לא תקין";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("report_fields")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("report_fields").insert({
    key: newFieldKey(),
    label,
    field_type: type,
    show_in_notes: type === "longtext" && formData.get("show_in_notes") === "on",
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (error) return error.message;
  refresh();
}

export async function updateField(key: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "שם הרובריקה הוא שדה חובה";
  const type = String(formData.get("field_type") ?? "text");
  if (!isType(type)) return "סוג שדה לא תקין";

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("report_fields")
    .select("photo_slot")
    .eq("key", key)
    .maybeSingle<{ photo_slot: string | null }>();
  if (!current) return "הרובריקה לא נמצאה";

  // A photo slot, once given, is kept (turning the option off only hides the
  // photo box) so photos already attached to the field are not orphaned.
  const wantsPhoto = formData.get("with_photo") === "on" && type !== "longtext" && type !== "floor_manager";
  const photoSlot = wantsPhoto ? (current.photo_slot ?? `p_${key}`) : null;
  const defaultValue = String(formData.get("default_value") ?? "").trim() || null;

  const { error } = await supabase
    .from("report_fields")
    .update({
      label,
      field_type: type,
      default_value: type === "floor_manager" ? null : defaultValue,
      show_in_notes: type === "longtext" && formData.get("show_in_notes") === "on",
      photo_slot: photoSlot,
    })
    .eq("key", key);
  if (error) return error.message;
  refresh();
}

export async function moveField(key: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("report_fields").select("key").order("sort_order");
  const keys = (data ?? []).map((row) => row.key as string);
  const index = keys.indexOf(key);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= keys.length) return;
  [keys[index], keys[target]] = [keys[target], keys[index]];

  for (let i = 0; i < keys.length; i++) {
    const { error } = await supabase.from("report_fields").update({ sort_order: (i + 1) * 10 }).eq("key", keys[i]);
    if (error) return error.message;
  }
  refresh();
}

// Removing a field hides it from every report, past ones included. The values
// already saved on events stay in the database but are no longer shown.
export async function deleteField(key: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("report_fields").delete().eq("key", key);
  if (error) return error.message;
  refresh();
}
