"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { EVENT_TYPE_LABELS, formatDate, formatTime, scheduleSortKey } from "@/lib/labels";
import type { EventRow, EventSupplierRow, TimelineItemRow } from "@/lib/types";

export function EventFormExport({
  event,
  managerName,
  suppliers,
  scheduleItems,
}: {
  event: EventRow;
  managerName: string | null;
  suppliers: EventSupplierRow[];
  scheduleItems: Pick<TimelineItemRow, "label" | "approx_time" | "notes">[];
}) {
  const fields: [string, string | number | null][] = [
    ["שעת התחלה", formatTime(event.start_time)],
    ["שעת סיום", formatTime(event.end_time)],
    ["מספר אורחים - התחייבות", event.estimated_guests],
    ["מנהל/ת אירוע אחראי/ת", managerName],
    ["איש/ת מכירות", event.sales_person_name],
    ["שמות הורי הכלה", event.bride_parents_names],
    ["שמות הורי החתן", event.groom_parents_names],
    ["אימייל 1", event.contact_email],
    ["טלפון 1", event.contact_phone],
    ["אימייל 2", event.contact_email_2],
    ["טלפון 2", event.contact_phone_2],
  ];

  const sortedSchedule = [...scheduleItems].sort(
    (a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time),
  );

  return (
    <PdfExportButton
      label="הורדת טופס אירוע"
      filename={`טופס-אירוע-${event.name}.pdf`}
      eventLabel={`${event.name} · ${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.event_date)}`}
      showSignature={false}
    >
      <div className="flex flex-col gap-4">
        <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
          <h1 className="font-serif text-xl font-bold">{event.name}</h1>
          <div className="text-sm" style={{ color: "#525252" }}>
            {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-2 pb-1"
              style={{ borderBottom: "1px solid #e5e5e5" }}
            >
              <span style={{ color: "#737373" }}>{label}</span>
              <span className="font-medium">{value != null && value !== "" ? value : "—"}</span>
            </div>
          ))}
        </div>

        {event.menu_notes && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">מידע נוסף</p>
            <p className="whitespace-pre-wrap text-[12.5px]">{event.menu_notes}</p>
          </div>
        )}

        {event.parking_notes && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">הערות חניה</p>
            <p className="whitespace-pre-wrap text-[12.5px]">{event.parking_notes}</p>
          </div>
        )}

        {suppliers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold underline">ספקים</p>
            <ul className="flex flex-col gap-1">
              {suppliers.map((supplier) => (
                <li key={supplier.id} className="text-[12.5px]">
                  {supplier.role && <span className="font-medium">{supplier.role}: </span>}
                  {supplier.name}
                  {supplier.phone && <span style={{ color: "#737373" }}> · {supplier.phone}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sortedSchedule.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold underline">לוח זמנים</p>
            <ul className="flex flex-col gap-1">
              {sortedSchedule.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-[12.5px]">
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
        )}
      </div>
    </PdfExportButton>
  );
}
