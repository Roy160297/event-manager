"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { EventSummaryReportPrintable } from "@/components/EventSummaryReportPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

export function EventSummaryReportExport({
  event,
  managerName,
  guestCommitment,
}: {
  event: EventRow | null;
  managerName: string | null;
  guestCommitment: string | null;
}) {
  if (!event) return null;

  return (
    <PdfExportButton
      filename={`דוח-סיכום-${event.name}.pdf`}
      eventLabel={`${event.name} · ${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      signerName={managerName}
    >
      <EventSummaryReportPrintable event={event} managerName={managerName} guestCommitment={guestCommitment} />
    </PdfExportButton>
  );
}
