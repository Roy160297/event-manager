import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: link } = await supabase.rpc("link_staff_account").single<{ linked: boolean; has_role: boolean }>();

      if (!link?.linked) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_authorized`);
      }

      return NextResponse.redirect(`${origin}${link.has_role ? "/" : "/pending"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
