"use client";

import { useState } from "react";
import { WelcomeEmailForm } from "./WelcomeEmailForm";

export function SendWelcomeEmailButton({
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
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium hover:bg-accent-soft"
      >
        שליחת מייל פתיחה לזוג
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-4">
      <p className="font-serif text-lg font-bold">שליחת מייל פתיחה לזוג</p>
      <WelcomeEmailForm
        eventId={eventId}
        to1={to1}
        to2={to2}
        defaultSubject={defaultSubject}
        defaultBody={defaultBody}
        cancelLabel="ביטול"
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
