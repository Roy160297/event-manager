"use client";

import { useRef, useState } from "react";
import { ChecklistPrintable } from "@/components/ChecklistPrintable";
import { EventSummaryReportPrintable } from "@/components/EventSummaryReportPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { sendAllChecklistsEmail } from "@/app/events/actions";
import { CHECKLIST_EMAIL_TO, CHECKLIST_EMAIL_CC } from "@/lib/checklistEmailRecipients";
import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import type { EventRow } from "@/lib/types";

export interface ChecklistForEmail {
  key: string;
  title: string;
  categories: ClosingChecklistCategory[];
  checkedKeys: string[];
  note?: string | null;
  noteLabel?: string;
  showCategoryLabels?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "16.7" - day.month with no leading zeros, matching the venue's existing
// manual convention for these subject lines (not the app's usual DD/MM/YYYY).
function shortDayMonth(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const [, month, day] = eventDate.split("-").map(Number);
  if (!day || !month) return null;
  return `${day}.${month}`;
}

// Filename-safe date (no slashes) - includes the year, unlike the subject's
// short form, so files from different years never collide.
function fileDate(eventDate: string | null): string {
  if (!eventDate) return "";
  const [year, month, day] = eventDate.split("-").map(Number);
  if (!day || !month || !year) return "";
  return `${day}.${month}.${year}`;
}

function EditableRecipientList({
  label,
  emails,
  onChange,
}: {
  label: string;
  emails: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setError("כתובת מייל לא תקינה");
      return;
    }
    if (emails.includes(value)) {
      setError("הכתובת כבר ברשימה");
      return;
    }
    onChange([...emails, value]);
    setDraft("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground/60">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {emails.map((email) => (
          <li key={email} className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs">
            {email}
            <button
              type="button"
              onClick={() => onChange(emails.filter((e) => e !== email))}
              className="text-foreground/50 hover:text-red-600"
              aria-label={`הסר ${email}`}
            >
              ✕
            </button>
          </li>
        ))}
        {emails.length === 0 && <li className="text-xs text-foreground/50">אין נמענים</li>}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="כתובת מייל להוספה"
          className="rounded-md border border-border-classic bg-surface px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-full border border-accent px-2 py-1 text-xs text-accent hover:bg-accent-soft"
        >
          הוסף
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SendChecklistsEmailButton({
  event,
  managerName,
  managerEmail,
  guestCommitment,
  checklists,
}: {
  event: EventRow;
  managerName: string | null;
  managerEmail: string | null;
  guestCommitment: string | null;
  checklists: ChecklistForEmail[];
}) {
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const footerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [step, setStep] = useState<"idle" | "preparing" | "review" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ filename: string; base64: string }[] | null>(null);
  const [toList, setToList] = useState<string[]>(CHECKLIST_EMAIL_TO);
  const [ccList, setCcList] = useState<string[]>(CHECKLIST_EMAIL_CC);

  const eventLabel = `${event.name} · ${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`;
  const coupleLabel =
    event.groom_name && event.bride_name
      ? `${event.groom_name} ו${event.bride_name}`
      : (event.groom_name ?? event.bride_name ?? null);
  const dayMonth = shortDayMonth(event.event_date);
  // Same name shown in the PDF filenames - falls back to the client/event
  // name when the couple's own names aren't filled in on the event.
  const nameLabel = coupleLabel ?? event.name;
  const subject =
    `דוח סיכום אירוע - ${nameLabel}` + (dayMonth ? `.${dayMonth}` : "") + (managerName ? ` - ${managerName}` : "");
  const dateForFilename = fileDate(event.event_date);
  const filenameBase = `${nameLabel}${dateForFilename ? `-${dateForFilename}` : ""}`;
  const bodyText = `מצורפים כל צ&apos;קליסטי הסגירה ודוח סיכום האירוע עבור ${eventLabel}.${
    managerName ? `<br/>נשלח על ידי: ${managerName}` : ""
  }`;

  const printables = [
    ...checklists.map((checklist) => ({
      key: checklist.key,
      filenameTitle: checklist.title,
      body: (
        <ChecklistPrintable
          title={checklist.title}
          eventName={event.name}
          eventType={event.event_type}
          eventDate={event.event_date}
          categories={checklist.categories}
          checked={new Set(checklist.checkedKeys)}
          note={checklist.note}
          noteLabel={checklist.noteLabel}
          showCategoryLabels={checklist.showCategoryLabels}
        />
      ),
    })),
    {
      key: "event_summary_report",
      filenameTitle: "דוח סיכום אירוע - מנהל אירוע",
      body: <EventSummaryReportPrintable event={event} managerName={managerName} guestCommitment={guestCommitment} />,
    },
  ];

  async function prepare() {
    setStep("preparing");
    setError(null);
    try {
      const { renderElementToPdfBase64 } = await import("@/lib/pdfExport");
      const built: { filename: string; base64: string }[] = [];
      for (let index = 0; index < printables.length; index += 1) {
        const contentElement = contentRefs.current[index];
        const footerElement = footerRefs.current[index];
        if (!contentElement || !footerElement) continue;
        const base64 = await renderElementToPdfBase64({ contentElement, footerElement });
        built.push({ filename: `${printables[index].filenameTitle}-${filenameBase}.pdf`, base64 });
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
      await sendAllChecklistsEmail({ to: toList, cc: ccList, subject, bodyText, replyTo: managerEmail, attachments });
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
        <div className="flex w-full max-w-md flex-col gap-3 rounded-md border border-border-classic bg-accent-soft/30 p-3 text-sm">
          <p className="font-medium">בדיקה לפני שליחה</p>
          <p className="text-xs">
            <span className="text-foreground/60">נושא: </span>
            {subject}
          </p>

          {step === "sent" ? (
            <>
              <p className="text-xs">
                <span className="text-foreground/60">אל: </span>
                {toList.join(", ")}
              </p>
              <p className="text-xs">
                <span className="text-foreground/60">עותק: </span>
                {ccList.join(", ") || "—"}
              </p>
            </>
          ) : (
            <>
              <EditableRecipientList label="אל:" emails={toList} onChange={setToList} />
              <EditableRecipientList label="עותק:" emails={ccList} onChange={setCcList} />
            </>
          )}

          <p className="text-xs">
            <span className="text-foreground/60">מענה לכתובת (Reply-To): </span>
            {managerEmail ?? "—"}
          </p>
          <div className="flex flex-col gap-1 text-xs">
            <p className="text-foreground/60">קבצים מצורפים:</p>
            {step === "sent" ? (
              <ul className="list-inside list-disc">
                {attachments.map((a) => (
                  <li key={a.filename}>{a.filename}</li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-col gap-1">
                {attachments.map((a) => (
                  <li key={a.filename} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev?.filter((x) => x.filename !== a.filename) ?? prev)}
                      className="text-foreground/50 hover:text-red-600"
                      aria-label={`הסר ${a.filename}`}
                    >
                      ✕
                    </button>
                    {a.filename}
                  </li>
                ))}
                {attachments.length === 0 && <li className="text-foreground/50">אין קבצים מצורפים</li>}
              </ul>
            )}
          </div>

          {step === "sent" ? (
            <p className="text-sm font-medium text-green-700">נשלח בהצלחה</p>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={confirmSend}
                disabled={step === "sending" || toList.length === 0 || attachments.length === 0}
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

      {/* Offscreen printable body for each checklist + the summary report, captured via html2canvas on prepare. */}
      <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
        {printables.map((printable, index) => (
          <div key={printable.key}>
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
              {printable.body}
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
