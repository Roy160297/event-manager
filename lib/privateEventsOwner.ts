import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// The e-mail that owns the private-events section, or null when the section is
// off (see lib/privateEvents.ts). Read with the service role because venue
// admins must not be able to read it; cached since every page asks.
const readOwnerEmail = unstable_cache(
  async (): Promise<string | null> => {
    const { data, error } = await createAdminClient()
      .from("app_settings")
      .select("value")
      .eq("key", "private_events_owner_email")
      .maybeSingle<{ value: string }>();
    if (error) throw new Error(error.message);
    return data?.value?.trim() || null;
  },
  ["private-events-owner"],
  { tags: ["private-events-owner"], revalidate: 300 },
);

export async function getPrivateEventsOwnerEmail(): Promise<string | null> {
  try {
    return await readOwnerEmail();
  } catch {
    return null;
  }
}
