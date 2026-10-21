"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { EventSummaryReportPrintable } from "@/components/EventSummaryReportPrintable";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { ReportField } from "@/lib/reportFields";
import type { EventRow } from "@/lib/types";

export function EventSummaryReportExport({
  event,
  reportFields,
  managerName,
  floorManagerName,
  guestCommitment,
  signedByName,
  signatureData,
  photoUrls,
}: {
  event: EventRow | null;
  reportFields: ReportField[];
  managerName: string | null;
  floorManagerName: string | null;
  guestCommitment: string | null;
  signedByName?: string | null;
  signatureData?: string | null;
  photoUrls?: string[];
}) {
  if (!event) return null;

  return (
    <PdfExportButton
      filename={`דוח-סיכום-${event.name}.pdf`}
      eventLabel={`${event.name} · ${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      signerName={signedByName ?? managerName}
      storedSignature={signatureData ?? null}
    >
      <EventSummaryReportPrintable
        event={event}
        reportFields={reportFields}
        managerName={managerName}
        floorManagerName={floorManagerName}
        guestCommitment={guestCommitment}
        photoUrls={photoUrls}
      />
    </PdfExportButton>
  );
}
