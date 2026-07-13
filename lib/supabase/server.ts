import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Not parameterized with a generated Database type — this is a hand-written
// scaffold. Once the Supabase project is linked, prefer generating real
// types with `supabase gen types typescript` and passing them here.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without a writable cookie jar; safe to ignore
            // since middleware refreshes sessions on navigation.
          }
        },
      },
    },
  );
}
