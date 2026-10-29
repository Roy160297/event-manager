"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate, formatTime } from "@/lib/labels";
import type { PrivateEventRow } from "@/lib/types";

// The saved summary as a PDF, in the same plain look as the event form.
export function ReportExport({ event }: { event: PrivateEventRow }) {
  const fields: [string, string | null][] = [
    ["כמות אורחים סופית - אייפלן", event.report_guests_iplan],
    ["כמות ילדים (אורחים)", event.report_children_count],
    ["שעת עזיבה", event.report_exit_time ? formatTime(event.report_exit_time) : null],
  ];

  return (
    <PdfExportButton
      label="הורדת הדוח (PDF)"
      filename={`דוח-סיכום-${event.name}.pdf`}
      eventLabel={`${event.name} · ${PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      showSignature={false}
    >
      <div className="flex flex-col gap-4">
        <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
          <h1 className="font-serif text-xl font-bold">דוח סיכום אירוע - {event.name}</h1>
          <div className="text-sm" style={{ color: "#525252" }}>
            {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          {fields.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 pb-1" style={{ borderBottom: "1px solid #e5e5e5" }}>
              <span style={{ color: "#737373" }}>{label}</span>
              <span className="font-medium">{value ? value : "—"}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">הערות</p>
          <p className="whitespace-pre-wrap text-[12.5px]">{event.report_notes?.trim() ? event.report_notes : "—"}</p>
        </div>
      </div>
    </PdfExportButton>
  );
}
