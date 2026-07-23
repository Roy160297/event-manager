"use client";

import { useRef, useState } from "react";
import { ChecklistPrintable } from "@/components/ChecklistPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { sendAllChecklistsEmail } from "@/app/events/actions";
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

export function SendChecklistsEmailButton({
  eventName,
  eventType,
  eventDate,
  checklists,
}: {
  eventName: string;
  eventType: EventType;
  eventDate: string | null;
  checklists: ChecklistForEmail[];
}) {
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const footerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const eventLabel = `${eventName} · ${EVENT_TYPE_LABELS[eventType]} · ${formatDate(eventDate)}`;

  async function send() {
    setStatus("sending");
    setError(null);
    try {
      const { renderElementToPdfBase64 } = await import("@/lib/pdfExport");
      const attachments: { filename: string; base64: string }[] = [];
      for (let index = 0; index < checklists.length; index += 1) {
        const contentElement = contentRefs.current[index];
        const footerElement = footerRefs.current[index];
        if (!contentElement || !footerElement) continue;
        const base64 = await renderElementToPdfBase64({ contentElement, footerElement });
        attachments.push({ filename: `${checklists[index].title}-${eventName}.pdf`, base64 });
      }
      await sendAllChecklistsEmail(eventLabel, attachments);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחת המייל");
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={send}
        disabled={status === "sending"}
        className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft disabled:opacity-60"
      >
        {status === "sending" ? "שולח..." : status === "sent" ? "נשלח בהצלחה" : "שליחת כל הצ'קליסטים במייל"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Offscreen printable body for each checklist, captured via html2canvas on send. */}
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
