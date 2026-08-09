import type { SupabaseClient } from "@supabase/supabase-js";

// Tzach Ziv's DJ setup swaps the venue's usual round DJ stand for a full
// stage - whenever he's booked, the event's iPlan sketch needs a matching
// edit, easy to forget since nothing else about the event flags it. Matched
// by supplier name (not role) since that's the only place this shows up.
const DJ_NAME_MATCH = "צח זיו";
export const DJ_SKETCH_TASK_TITLE = "עדכון סקיצה (במה במקום עמדה עגולה) - הדיג'י הוא צח זיו";
const DJ_SKETCH_DESCRIPTION =
  "הדיג'יי באירוע הוא צח זיו - יש לעדכן את הסקיצה בהתאם: להוציא את עמדת הדיג'יי העגולה ולהכניס במה במקומה.";

function isDjTzachZiv(name: string | null | undefined): boolean {
  return !!name && name.includes(DJ_NAME_MATCH);
}

// Called right after suppliers are inserted (manual add, image import, or
// PDF import) - creates a one-time task on the event if any of the
// newly-added names match, so nobody has to notice this on their own.
export async function maybeCreateDjSketchTask(
  supabase: SupabaseClient,
  eventId: string,
  addedSupplierNames: (string | null | undefined)[],
): Promise<void> {
  if (!addedSupplierNames.some(isDjTzachZiv)) return;

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("title", DJ_SKETCH_TASK_TITLE);
  if ((count ?? 0) > 0) return;

  const { data: event } = await supabase
    .from("events")
    .select("event_date, manager_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return;

  await supabase.from("tasks").insert({
    event_id: eventId,
    title: DJ_SKETCH_TASK_TITLE,
    description: DJ_SKETCH_DESCRIPTION,
    assignee_id: event.manager_id,
    due_date: event.event_date,
    priority: "high",
  });
}

// Used by the reminder-email rule below, which checks the event's *current*
// supplier list (not just what was added in one specific call).
export async function hasDjTzachZivSupplier(supabase: SupabaseClient, eventId: string): Promise<boolean> {
  const { data } = await supabase.from("event_suppliers").select("name").eq("event_id", eventId);
  return (data ?? []).some((supplier) => isDjTzachZiv(supplier.name));
}
