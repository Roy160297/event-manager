"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { EventSummaryReportPrintable } from "@/components/EventSummaryReportPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

export function EventSummaryReportExport({
  event,
  managerName,
  guestCommitment,
  signedByName,
  signatureData,
}: {
  event: EventRow | null;
  managerName: string | null;
  guestCommitment: string | null;
  signedByName?: string | null;
  signatureData?: string | null;
}) {
  if (!event) return null;

  return (
    <PdfExportButton
      filename={`דוח-סיכום-${event.name}.pdf`}
      eventLabel={`${event.name} · ${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      signerName={signedByName ?? managerName}
      storedSignature={signatureData ?? null}
    >
      <EventSummaryReportPrintable event={event} managerName={managerName} guestCommitment={guestCommitment} />
    </PdfExportButton>
  );
}
