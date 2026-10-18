import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const VENUE_SETTINGS_CACHE_TAG = "venue-settings";

// Venue-wide values that used to be hardcoded in the source (name, the closing
// checklist distribution list, the welcome email text...). One row in the
// venue_settings table, edited by staff holding the venue_settings permission.
export interface VenueSettings {
  venue_name: string;
  calendar_name: string;
  checklist_email_to: string[];
  checklist_email_cc: string[];
  welcome_email_subject: string;
  welcome_email_body: string;
  welcome_email_attachment_filename: string;
}

// Only used if the row can't be read at all, so a database hiccup never leaves
// the header or an outgoing email without a name.
const FALLBACK: VenueSettings = {
  venue_name: "ניהול אירועים",
  calendar_name: "אירועים",
  checklist_email_to: [],
  checklist_email_cc: [],
  welcome_email_subject: "",
  welcome_email_body: "",
  welcome_email_attachment_filename: "",
};

// Read with the service-role client because it is needed where there is no
// logged-in user (the login page, the PWA manifest, cron emails), and cached
// because it is read on every page render. The data is not sensitive: every
// staff member can read it anyway. A failed read throws inside the cached
// function so the failure itself is never cached.
const readVenueSettings = unstable_cache(
  async (): Promise<VenueSettings> => {
    const { data, error } = await createAdminClient()
      .from("venue_settings")
      .select(
        "venue_name, calendar_name, checklist_email_to, checklist_email_cc, welcome_email_subject, welcome_email_body, welcome_email_attachment_filename",
      )
      .eq("id", true)
      .maybeSingle<VenueSettings>();
    if (error || !data) throw new Error(error?.message ?? "venue_settings row not found");
    return data;
  },
  ["venue-settings"],
  { tags: [VENUE_SETTINGS_CACHE_TAG] },
);

export async function getVenueSettings(): Promise<VenueSettings> {
  try {
    return await readVenueSettings();
  } catch (err) {
    console.error("getVenueSettings failed", err);
    return FALLBACK;
  }
}
