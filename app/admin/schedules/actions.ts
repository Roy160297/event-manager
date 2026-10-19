"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { DayKind } from "@/lib/scheduleTemplates";

// Every action returns an error message instead of throwing (Next.js hides thrown
// Server Action messages in production), and undefined on success.
type Result = Promise<string | void>;

const DENIED = "אין הרשאה לערוך לוחות זמנים";
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

async function allowed(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return !!staff && canWrite(staff.permissions, "venue_settings");
}

function refresh() {
  revalidatePath("/admin/schedules");
  revalidatePath("/events", "layout");
  revalidatePath("/push-reminders");
}

// The step time as stored: always two-digit hours ("9:30" -> "09:30").
function normalizeTime(raw: string): string | null {
  const value = raw.trim();
  if (!TIME_RE.test(value)) return null;
  const [h, m] = value.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

export async function createTemplate(formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "יש להזין שם לתבנית";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("schedule_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("schedule_templates").insert({ name, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return error.message;
  refresh();
}

export async function duplicateTemplate(id: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data: source } = await supabase.from("schedule_templates").select("*").eq("id", id).maybeSingle();
  if (!source) return "התבנית לא נמצאה";
  const { data: last } = await supabase
    .from("schedule_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  // The copy starts as a manual-only template, so it never competes with the
  // original for the automatic choice until the venue assigns it event types.
  const { data: copy, error } = await supabase
    .from("schedule_templates")
    .insert({
      name: `${source.name} (עותק)`,
      event_types: [],
      day_kind: source.day_kind,
      reference_time: source.reference_time,
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return error.message;

  const { data: steps } = await supabase.from("schedule_template_steps").select("label, step_time, notes").eq("template_id", id);
  if (steps && steps.length > 0) {
    const { error: stepsError } = await supabase
      .from("schedule_template_steps")
      .insert(steps.map((step) => ({ ...step, template_id: copy.id })));
    if (stepsError) return stepsError.message;
  }
  refresh();
}

export async function updateTemplate(id: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "שם התבנית הוא שדה חובה";

  const dayKind = String(formData.get("day_kind") ?? "any") as DayKind;
  if (!["any", "friday", "not_friday"].includes(dayKind)) return "יום לא תקין";

  const validTypes = Object.keys(EVENT_TYPE_LABELS);
  const types = formData.getAll("event_types").map(String).filter((type) => validTypes.includes(type));

  const rawReference = String(formData.get("reference_time") ?? "").trim();
  const referenceTime = rawReference ? normalizeTime(rawReference) : null;
  if (rawReference && !referenceTime) return "שעת הייחוס אינה תקינה";

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_templates")
    .update({ name, event_types: types, day_kind: dayKind, reference_time: referenceTime })
    .eq("id", id);
  if (error) return error.message;
  refresh();
}

export async function moveTemplate(id: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("schedule_templates").select("id").order("sort_order");
  const ordered = (data ?? []).map((row) => row.id as string);
  const index = ordered.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase.from("schedule_templates").update({ sort_order: (i + 1) * 10 }).eq("id", ordered[i]);
    if (error) return error.message;
  }
  refresh();
}

export async function deleteTemplate(id: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_templates").delete().eq("id", id);
  if (error) return error.message;
  refresh();
}

export async function addStep(templateId: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  const time = normalizeTime(String(formData.get("step_time") ?? ""));
  if (!label || !time) return "כותרת השלב והשעה הם שדות חובה";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_template_steps").insert({ template_id: templateId, label, step_time: time, notes });
  if (error) return error.message;
  refresh();
}

export async function updateStep(stepId: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  const time = normalizeTime(String(formData.get("step_time") ?? ""));
  if (!label || !time) return "כותרת השלב והשעה הם שדות חובה";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_template_steps").update({ label, step_time: time, notes }).eq("id", stepId);
  if (error) return error.message;
  refresh();
}

export async function deleteStep(stepId: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_template_steps").delete().eq("id", stepId);
  if (error) return error.message;
  refresh();
}
