"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/demoMode";

export async function signInWithGoogle() {
  const supabase = await createClient();

  // Demo environment only (NEXT_PUBLIC_DEMO_MODE): the button looks and
  // behaves like the Google sign-in, but signs straight in as the demo user
  // with the credentials from .env.demo - no Google account involved.
  if (IS_DEMO) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.DEMO_LOGIN_EMAIL ?? "",
      password: process.env.DEMO_LOGIN_PASSWORD ?? "",
    });
    if (error) throw new Error(error.message);
    redirect("/");
  }

  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      // Without this, Google silently reuses whatever Google account is
      // already active in the browser instead of letting the user pick.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) throw new Error(error?.message ?? "שגיאה בהתחברות עם Google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
