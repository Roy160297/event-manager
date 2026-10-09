import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth", "/pending"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims verifies the session token's signature locally (the project
  // signs with an asymmetric key) instead of calling the Auth server like
  // getUser does - that call ran on every request, including each link
  // prefetch, and was the largest fixed cost of every page navigation. It
  // still refreshes an expired token. RLS keeps enforcing access regardless.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!userId) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!isPublic) {
    const { data: staff, error } = await supabase.from("staff").select("role_id").eq("user_id", userId).maybeSingle();
    if (error) {
      // A transient DB/network error here must not be treated as "no role
      // assigned" - that would bounce an already-authorized user to /pending
      // (and offer only a log-out button) on an ordinary refresh. Fail open
      // and let the request through; RLS still enforces actual access.
      console.error(`proxy: staff role lookup failed for user ${userId}:`, error);
    } else if (!staff?.role_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Excludes /api - route handlers there (e.g. the cron reminders endpoint)
  // authenticate themselves (a shared secret, not a user session) and must
  // stay reachable with no logged-in user, unlike every page route.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
