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
    .select("name")
    .eq("event_date", eventDate)
    .is("deleted_at", null)
    .limit(1);
  if (excludeEventId) query = query.neq("id", excludeEventId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    throw new Error(`כבר קיים אירוע בתאריך זה. - ${data[0].name}`);
  }
}
