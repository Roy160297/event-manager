"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { sendPushToStaff } from "@/lib/pushNotifications";

export async function subscribeToPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("יש להתחבר כדי להפעיל התראות");

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      staff_id: staff.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) throw new Error(error.message);
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

// Lets a staff member confirm the whole pipeline (subscribe -> send ->
// receive) actually works on their device, before any real reminder relies
// on it.
export async function sendTestPush() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("יש להתחבר כדי לשלוח התראת בדיקה");

  const result = await sendPushToStaff(staff.id, {
    title: "התראת בדיקה",
    body: "אם אתה רואה את זה - ההתראות עובדות!",
  });

  if (result.total === 0) throw new Error("לא נמצא מכשיר רשום - יש להפעיל התראות קודם");
  return result;
}
