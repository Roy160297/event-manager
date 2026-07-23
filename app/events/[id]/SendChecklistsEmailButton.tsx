"use client";

import { useRef, useState } from "react";
import { ChecklistPrintable } from "@/components/ChecklistPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { sendAllChecklistsEmail } from "@/app/events/actions";
import { CHECKLIST_EMAIL_TO, CHECKLIST_EMAIL_CC } from "@/lib/checklistEmailRecipients";
import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import type { EventType } from "@/lib/types";

export interface ChecklistForEmail {
  key: string;
  title: string;
  categories: ClosingChecklistCategory[];
  checkedKeys: string[];
  note?: string | null;
  noteLabel?: string;
  showCategoryLabels?: boolean;
}

// "16.7" - day.month with no leading zeros, matching the venue's existing
// manual convention for these subject lines (not the app's usual DD/MM/YYYY).
function shortDayMonth(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const [, month, day] = eventDate.split("-").map(Number);
  if (!day || !month) return null;
  return `${day}.${month}`;
}

export function SendChecklistsEmailButton({
  eventName,
  eventType,
  eventDate,
  managerName,
  managerEmail,
  checklists,
}: {
  eventName: string;
  eventType: EventType;
  eventDate: string | null;
  managerName: string | null;
  managerEmail: string | null;
  checklists: ChecklistForEmail[];
}) {
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const footerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [step, setStep] = useState<"idle" | "preparing" | "review" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ filename: string; base64: string }[] | null>(null);

  const eventLabel = `${eventName} · ${EVENT_TYPE_LABELS[eventType]} · ${formatDate(eventDate)}`;
  const dayMonth = shortDayMonth(eventDate);
  const subject = ["דוח סיכום אירוע", dayMonth].filter(Boolean).join(".") + (managerName ? ` - ${managerName}` : "");
  const bodyText = `מצורפים כל צ&apos;קליסטי הסגירה עבור ${eventLabel}.${
    managerName ? `<br/>נשלח על ידי: ${managerName}` : ""
  }`;

  async function prepare() {
    setStep("preparing");
    setError(null);
    try {
      const { renderElementToPdfBase64 } = await import("@/lib/pdfExport");
      const built: { filename: string; base64: string }[] = [];
      for (let index = 0; index < checklists.length; index += 1) {
        const contentElement = contentRefs.current[index];
        const footerElement = footerRefs.current[index];
        if (!contentElement || !footerElement) continue;
        const base64 = await renderElementToPdfBase64({ contentElement, footerElement });
        built.push({ filename: `${checklists[index].title}-${eventName}.pdf`, base64 });
      }
      setAttachments(built);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהכנת ה-PDF");
      setStep("idle");
    }
  }

  async function confirmSend() {
    if (!attachments) return;
    setStep("sending");
    setError(null);
    try {
      await sendAllChecklistsEmail({ subject, bodyText, replyTo: managerEmail, attachments });
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחת המייל");
      setStep("review");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {step === "idle" && (
        <button
          type="button"
          onClick={prepare}
          className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
        >
          שליחת כל הצ&apos;קליסטים במייל
        </button>
      )}

      {step === "preparing" && (
        <button
          type="button"
          disabled
          className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent opacity-60"
        >
          מכין לבדיקה...
        </button>
      )}

      {(step === "review" || step === "sending" || step === "sent") && attachments && (
        <div className="flex w-full max-w-md flex-col gap-2 rounded-md border border-border-classic bg-accent-soft/30 p-3 text-sm">
          <p className="font-medium">בדיקה לפני שליחה</p>
          <div className="flex flex-col gap-1 text-xs">
            <p><span className="text-foreground/60">נושא: </span>{subject}</p>
            <p><span className="text-foreground/60">אל: </span>{CHECKLIST_EMAIL_TO.join(", ")}</p>
            <p><span className="text-foreground/60">עותק: </span>{CHECKLIST_EMAIL_CC.join(", ")}</p>
            <p>
              <span className="text-foreground/60">מענה לכתובת (Reply-To): </span>
              {managerEmail ?? "—"}
            </p>
            <p className="text-foreground/60">קבצים מצורפים:</p>
            <ul className="list-inside list-disc">
              {attachments.map((a) => (
                <li key={a.filename}>{a.filename}</li>
              ))}
            </ul>
          </div>

          {step === "sent" ? (
            <p className="text-sm font-medium text-green-700">נשלח בהצלחה</p>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={confirmSend}
                disabled={step === "sending"}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {step === "sending" ? "שולח..." : "אישור ושליחה"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setAttachments(null);
                }}
                disabled={step === "sending"}
                className="text-sm text-foreground/60 hover:underline"
              >
                ביטול
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Offscreen printable body for each checklist, captured via html2canvas on prepare. */}
      <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
        {checklists.map((checklist, index) => (
          <div key={checklist.key}>
            <div
              ref={(el) => {
                contentRefs.current[index] = el;
              }}
              dir="rtl"
              className="w-[780px] p-8 text-[13px] leading-relaxed"
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
            >
              <div dir="ltr" className="mb-4 flex items-baseline justify-start gap-1.5">
                <span className="text-lg font-black uppercase tracking-tight">House</span>
                <span className="font-serif text-sm italic" style={{ color: "#525252" }}>
                  No.
                </span>
                <span className="text-lg font-black uppercase tracking-tight">Seven</span>
              </div>
              <ChecklistPrintable
                title={checklist.title}
                eventName={eventName}
                eventType={eventType}
                eventDate={eventDate}
                categories={checklist.categories}
                checked={new Set(checklist.checkedKeys)}
                note={checklist.note}
                noteLabel={checklist.noteLabel}
                showCategoryLabels={checklist.showCategoryLabels}
              />
            </div>
            <div
              ref={(el) => {
                footerRefs.current[index] = el;
              }}
              dir="rtl"
              className="w-[780px]"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div
                className="flex items-end justify-between px-8 py-4 text-[13px]"
                style={{ borderTop: "1px solid #999999", color: "#555555" }}
              >
                <div />
                <div>{eventLabel}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
