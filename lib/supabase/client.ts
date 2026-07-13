import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with a generated Database type — this is a hand-written
// scaffold. Once the Supabase project is linked, prefer generating real
// types with `supabase gen types typescript` and passing them here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
