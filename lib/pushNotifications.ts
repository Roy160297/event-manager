import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow } from "@/lib/types";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("שליחת פוש אינה מוגדרת (חסרים משתני VAPID)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// Sends to every device the staff member has subscribed (phone + desktop,
// or after reinstalling the PWA) - best-effort per device, since one dead
// subscription shouldn't block the others. A subscription the push service
// reports as gone (410) or not found (404) is unsubscribed - the browser
// dropped it and it'll never succeed again.
export async function sendPushToStaff(staffId: string, payload: { title: string; body: string; url?: string }) {
  configureWebPush();
  const supabase = createAdminClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("staff_id", staffId)
    .returns<PushSubscriptionRow[]>();

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error(`Push send failed for subscription ${sub.id}:`, err);
      }
    }
  }

  return { sent, total: subscriptions?.length ?? 0 };
}
