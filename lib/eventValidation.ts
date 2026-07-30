import type { createClient } from "@/lib/supabase/server";

// Shared across every event creation/edit entry point (manual, PDF import,
// image import, and the overview page's save) so a manager can't
// accidentally double-book the venue for the same day.
export async function assertNoDuplicateEventDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventDate: string,
  excludeEventId?: string,
) {
  let query = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_date", eventDate)
    .is("deleted_at", null);
  if (excludeEventId) query = query.neq("id", excludeEventId);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error("כבר קיים אירוע בתאריך זה.");
  }
}
