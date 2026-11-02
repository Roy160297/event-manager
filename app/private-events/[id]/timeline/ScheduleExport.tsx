"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate, formatTime, scheduleSortKey } from "@/lib/labels";
import type { PrivateEventRow, PrivateEventTimelineItemRow } from "@/lib/types";

// Only the schedule as a PDF, in the same plain look as the event form.
export function ScheduleExport({
  event,
  items,
}: {
  event: Pick<PrivateEventRow, "name" | "event_type" | "event_date">;
  items: Pick<PrivateEventTimelineItemRow, "label" | "approx_time" | "notes">[];
}) {
  const sorted = [...items].sort((a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time));

  return (
    <PdfExportButton
      label="הורדת לו״ז (PDF)"
      filename={`לוז-${event.name}.pdf`}
      eventLabel={`${event.name} · ${PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      showSignature={false}
      showBrand={false}
    >
      <div className="flex flex-col gap-4">
        <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
          <h1 className="font-serif text-xl font-bold">לוח זמנים - {event.name}</h1>
          <div className="text-sm" style={{ color: "#525252" }}>
            {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {sorted.map((item, index) => (
            <li key={index} className="flex items-start gap-3 pb-1 text-[13px]" style={{ borderBottom: "1px solid #e5e5e5" }}>
              <span className="font-medium" style={{ minWidth: "2.5rem" }}>
                {formatTime(item.approx_time)}
              </span>
              <span>
                {item.label}
                {item.notes && <span style={{ color: "#737373" }}> - {item.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PdfExportButton>
  );
}
