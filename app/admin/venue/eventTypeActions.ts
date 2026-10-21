"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";
import { newEventTypeKey } from "@/lib/eventTypes";
import { EVENT_TYPES_CACHE_TAG } from "@/lib/eventTypesServer";

// Every action returns an error message instead of throwing (Next.js hides thrown
// Server Action messages in production), and undefined on success.
type Result = Promise<string | void>;

const DENIED = "אין הרשאה לערוך את סוגי האירוע";

async function allowed(): Promise<boolean> {
  const staff = await getCurrentStaff();
  return !!staff && canWrite(staff.permissions, "venue_settings");
}

function refresh() {
  updateTag(EVENT_TYPES_CACHE_TAG);
  revalidatePath("/", "layout");
}

export async function addEventType(formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "יש להזין שם לסוג האירוע";

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("event_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const { error } = await supabase.from("event_types").insert({
    key: newEventTypeKey(),
    label,
    is_business: formData.get("is_business") === "on",
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (error) return error.message;
  refresh();
}

export async function updateEventType(key: string, formData: FormData): Result {
  if (!(await allowed())) return DENIED;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return "שם סוג האירוע הוא שדה חובה";

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_types")
    .update({ label, is_business: formData.get("is_business") === "on" })
    .eq("key", key);
  if (error) return error.message;
  refresh();
}

export async function moveEventType(key: string, direction: "up" | "down"): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();
  const { data } = await supabase.from("event_types").select("key").order("sort_order");
  const keys = (data ?? []).map((row) => row.key as string);
  const index = keys.indexOf(key);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= keys.length) return;
  [keys[index], keys[target]] = [keys[target], keys[index]];

  for (let i = 0; i < keys.length; i++) {
    const { error } = await supabase.from("event_types").update({ sort_order: (i + 1) * 10 }).eq("key", keys[i]);
    if (error) return error.message;
  }
  refresh();
}

// A type can only be removed when nothing depends on it: no event of this type
// (including archived and deleted ones), no checklist or schedule template
// limited to it. Otherwise those would silently change meaning.
export async function deleteEventType(key: string): Result {
  if (!(await allowed())) return DENIED;
  const supabase = await createClient();

  const [{ count: total }, { count: events }, { data: checklists }, { data: templates }] = await Promise.all([
    supabase.from("event_types").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", key),
    supabase.from("checklists").select("label").contains("event_types", [key]),
    supabase.from("schedule_templates").select("name").contains("event_types", [key]),
  ]);

  if ((total ?? 0) <= 1) return "אי אפשר למחוק את סוג האירוע האחרון";
  if ((events ?? 0) > 0) return `${events === 1 ? "יש אירוע אחד" : `יש ${events} אירועים`} מסוג זה (כולל אירועים בארכיון ובפח). שנו אותם לסוג אחר לפני המחיקה.`;
  if (checklists && checklists.length > 0) {
    return `הסוג מוגדר בצ'קליסטים: ${checklists.map((row) => row.label).join(", ")}. הסירו אותו משם לפני המחיקה.`;
  }
  if (templates && templates.length > 0) {
    return `הסוג מוגדר בתבניות לוח זמנים: ${templates.map((row) => row.name).join(", ")}. הסירו אותו משם לפני המחיקה.`;
  }

  const { error } = await supabase.from("event_types").delete().eq("key", key);
  if (error) return error.message;
  refresh();
}
