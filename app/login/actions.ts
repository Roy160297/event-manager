"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
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
