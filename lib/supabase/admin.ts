import { createClient } from "@supabase/supabase-js";

// Service-role client for background jobs (e.g. the cron reminder route) that
// run with no logged-in user/session to attach RLS policies to - the normal
// lib/supabase/server.ts client relies on cookies() from an actual request,
// which a cron trigger doesn't have. Server-only: never expose this client or
// the underlying key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY אינו מוגדר בסביבת השרת");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
