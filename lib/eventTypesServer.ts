import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { FALLBACK_EVENT_TYPES, assembleEventTypes, labelsOf, type EventTypeInfo } from "@/lib/eventTypes";

export const EVENT_TYPES_CACHE_TAG = "event-types";

// Read with the service-role client (nothing here is sensitive, and it is needed
// where there is no logged-in user, such as the reminder cron) and cached, since
// nearly every page shows an event type. A failed read throws inside the cached
// function so the failure itself is never cached.
const readEventTypes = unstable_cache(
  async (): Promise<EventTypeInfo[]> => {
    const { data, error } = await createAdminClient().from("event_types").select("key, label, is_business, sort_order");
    if (error || !data || data.length === 0) throw new Error(error?.message ?? "no event types");
    return assembleEventTypes(data);
  },
  ["event-types"],
  { tags: [EVENT_TYPES_CACHE_TAG] },
);

export async function getEventTypes(): Promise<EventTypeInfo[]> {
  try {
    return await readEventTypes();
  } catch (err) {
    console.error("getEventTypes failed", err);
    return FALLBACK_EVENT_TYPES;
  }
}

export async function getEventTypeLabels(): Promise<Record<string, string>> {
  return labelsOf(await getEventTypes());
}
