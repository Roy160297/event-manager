"use client";

import { useState } from "react";
import { toWhatsAppDigits } from "@/lib/phone";

export function SendWhatsAppButton({
  to1,
  to2,
  defaultMessage,
}: {
  to1: string | null;
  to2: string | null;
  defaultMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const phones = [to1, to2].filter((phone): phone is string => Boolean(phone));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
      >
        שליחת הודעת וואטסאפ לזוג
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-4">
      <p className="font-serif text-lg font-bold">שליחת הודעת וואטסאפ לזוג</p>

      {phones.length === 0 && <p className="text-sm text-foreground/70">אין מספר טלפון מוגדר לאירוע זה</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">תוכן ההודעה</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className="rounded-md border border-border-classic bg-surface px-3 py-2 font-sans"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {phones.map((phone, index) => {
          const digits = toWhatsAppDigits(phone);
          if (!digits) return null;
          return (
            <a
              key={phone}
              href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              פתיחה בוואטסאפ{phones.length > 1 ? ` · טלפון ${index + 1}` : ""}
            </a>
          );
        })}
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-foreground/60 hover:underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
