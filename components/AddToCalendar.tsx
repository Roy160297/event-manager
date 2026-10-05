"use client";

import { useState } from "react";

export interface CalendarPreviewEvent {
  id: string;
  dateLabel: string;
  name: string;
  typeLabel: string;
  timeLabel: string;
}

const GOOGLE_IMPORT_URL = "https://calendar.google.com/calendar/u/0/r/settings/export";

const buttonClass =
  "rounded-full border-2 border-accent bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft";

// "Add to Google / Apple calendar" for the month on screen. Neither button
// adds anything on its own: each opens a preview of exactly the events that
// would be added, and only "אישור והוספה" downloads the month's .ics file
// (Apple Calendar and phones open it straight into an import prompt; Google
// has no one-click web import, so its page is opened alongside for the upload).
export function AddToCalendar({
  monthLabel,
  icsUrl,
  events,
}: {
  monthLabel: string;
  icsUrl: string;
  events: CalendarPreviewEvent[];
}) {
  const [target, setTarget] = useState<"google" | "apple" | null>(null);

  function confirm() {
    const link = document.createElement("a");
    link.href = icsUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (target === "google") window.open(GOOGLE_IMPORT_URL, "_blank", "noopener,noreferrer");
    setTarget(null);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => setTarget("google")}>
          הוסף ליומן גוגל
        </button>
        <button type="button" className={buttonClass} onClick={() => setTarget("apple")}>
          הוסף ליומן אפל
        </button>
      </div>

      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setTarget(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="תצוגה מקדימה להוספה ליומן"
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold">
              הוספה ליומן {target === "google" ? "גוגל" : "אפל"} - {monthLabel}
            </h2>

            {events.length === 0 ? (
              <p className="text-sm text-foreground/70">אין אירועים בחודש הזה.</p>
            ) : (
              <>
                <p className="text-sm text-foreground/70">{events.length} אירועים יתווספו:</p>
                <ul className="flex flex-col divide-y divide-border-classic overflow-y-auto rounded-md border border-border-classic">
                  {events.map((event) => (
                    <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{event.name}</span>{" "}
                        <span className="text-foreground/60">· {event.typeLabel}</span>
                      </span>
                      <span className="text-xs text-foreground/70">
                        {event.dateLabel} · {event.timeLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {target === "google" && events.length > 0 && (
              <p className="text-xs text-foreground/60">
                גוגל מוסיף אירועים מקובץ: אחרי האישור יורד קובץ, ונפתח עמוד היומן שבו בוחרים &quot;ייבוא&quot;
                ומעלים אותו.
              </p>
            )}

            <div className="flex gap-2">
              {events.length > 0 && (
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  אישור והוספה
                </button>
              )}
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
