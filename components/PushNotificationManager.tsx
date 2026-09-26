"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush, sendTestPush } from "@/app/push/actions";

// VAPID public keys are handed to the browser as a base64url string but the
// Push API wants raw bytes - same conversion the Web Push spec's own examples
// use, since atob() only understands base64 (with +/, not the URL-safe -_).
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Status = "checking" | "unsupported" | "off" | "on";

// Lazy so the unsupported case (SSR, or a browser without Push support)
// never needs a synchronous setState from inside the effect below - it's
// simply the initial value.
function initialStatus(): Status {
  if (typeof window === "undefined") return "checking";
  return "serviceWorker" in navigator && "PushManager" in window ? "checking" : "unsupported";
}

export function PushNotificationManager() {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "checking") return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? "on" : "off"))
      .catch(() => setStatus("unsupported"));
  }, [status]);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("התראות לא מוגדרות במערכת");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("ההרשאה נדחתה - אפשר לאשר אותה מחדש דרך הגדרות הדפדפן");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await subscribeToPush(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setStatus("on");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בהפעלת ההתראות");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בביטול ההתראות");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      await sendTestPush();
      setMessage("נשלחה התראת בדיקה");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בשליחת התראת הבדיקה");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <div className="flex items-center gap-1.5">
      {status === "off" ? (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="whitespace-nowrap rounded-full border border-border-classic bg-surface px-3 py-1 text-xs font-medium text-foreground/70 hover:border-accent hover:text-accent disabled:opacity-60"
        >
          הפעל התראות
        </button>
      ) : (
        <>
          <span className="whitespace-nowrap text-xs text-foreground/50">התראות פעילות</span>
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className="whitespace-nowrap rounded-full border border-border-classic bg-surface px-2 py-1 text-xs text-foreground/70 hover:border-accent hover:text-accent disabled:opacity-60"
          >
            שלח בדיקה
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="whitespace-nowrap text-xs text-foreground/50 hover:underline disabled:opacity-60"
          >
            כבה
          </button>
        </>
      )}
      {message && <span className="whitespace-nowrap text-xs text-foreground/60">{message}</span>}
    </div>
  );
}
