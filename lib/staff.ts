import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRow } from "@/lib/types";

export const EVENT_MANAGERS_CACHE_TAG = "event-managers";

// The "מנהל/ת אירוע אחראי/ת" dropdown query (staff eligible to manage an
// event) was duplicated across 4 pages (events list, event overview, both
// import wizards), each re-running it on every load. Every authenticated
// staff member has identical read access to this data (the staff table's
// select policy is is_staff_member(), not role-scoped), so it's safe to
// share one cached result across users instead of re-querying per request.
//
// Uses the admin client rather than the normal cookie-based one because
// unstable_cache can't call cookies()/other request-scoped APIs from inside
// the cached function.
export const getEventManagerCandidates = unstable_cache(
  async (): Promise<StaffRow[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("staff")
      .select("*, roles!inner(can_be_event_manager)")
      .eq("roles.can_be_event_manager", true)
      .order("name")
      .returns<StaffRow[]>();
    return data ?? [];
  },
  ["event-manager-candidates"],
  { tags: [EVENT_MANAGERS_CACHE_TAG] },
);

export const FLOOR_MANAGERS_CACHE_TAG = "floor-managers";

// The "מנהל/ת פלור" dropdown: staff whose assigned role is literally named
// "מנהל פלור" (an admin-managed role, same as bar/kitchen/barista roles),
// rather than a separate boolean flag - simpler since this role doesn't
// carry any other permission meaning.
export const getFloorManagerCandidates = unstable_cache(
  async (): Promise<StaffRow[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("staff")
      .select("*, roles!inner(name)")
      .eq("roles.name", "מנהל פלור")
      .order("name")
      .returns<StaffRow[]>();
    return data ?? [];
  },
  ["floor-manager-candidates"],
  { tags: [FLOOR_MANAGERS_CACHE_TAG] },
);
