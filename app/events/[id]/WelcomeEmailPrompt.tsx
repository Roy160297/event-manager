"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { sendWelcomeEmail } from "@/app/events/actions";
import { WELCOME_EMAIL_ATTACHMENT_FILENAME } from "@/lib/welcomeEmail";

export function WelcomeEmailPrompt({
  eventId,
  to1,
  to2,
  defaultSubject,
  defaultBody,
}: {
  eventId: string;
  to1: string | null;
  to2: string | null;
  defaultSubject: string;
  defaultBody: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Clears the ?newEvent=1 flag so a page refresh (or coming back later)
  // doesn't re-show this prompt.
  function clearFlag() {
    router.replace(pathname);
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      if (to1) formData.set("to1", to1);
      if (to2) formData.set("to2", to2);
      formData.set("subject", subject);
      formData.set("body", body);
      const result = await sendWelcomeEmail(eventId, formData);
      if (result) {
        setError(result);
        return;
      }
      setSent(true);
      clearFlag();
    });
  }

  if (dismissed) return null;

  const recipients = [to1, to2].filter(Boolean).join(", ");

  if (sent) {
    return (
      <div className="rounded-lg border border-accent bg-accent-soft/40 p-4">
        <p className="text-sm font-medium text-accent">המייל נשלח בהצלחה אל {recipients}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-4">
      <p className="font-serif text-lg font-bold">שליחת מייל פתיחה לזוג</p>
      <p className="text-sm text-foreground/70">
        נשלח אל: {recipients} · מצורף &quot;{WELCOME_EMAIL_ATTACHMENT_FILENAME}&quot;
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">נושא</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-md border border-border-classic bg-surface px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">תוכן המייל</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="rounded-md border border-border-classic bg-surface px-3 py-2 font-sans"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "שולח..." : "שלח מייל"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            clearFlag();
          }}
          className="text-sm text-foreground/60 hover:underline"
        >
          דלג
        </button>
      </div>
    </div>
  );
}
