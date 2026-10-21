"use client";

import { useEventTypeLabel } from "@/components/EventTypesProvider";
import { formatDate, formatTime } from "@/lib/labels";
import { REPORT_END_TIME_KEY, displayValue, longFields, shortFields, type ReportField } from "@/lib/reportFields";
import type { EventRow } from "@/lib/types";

export function EventSummaryReportPrintable({
  event,
  reportFields,
  managerName,
  floorManagerName,
  guestCommitment,
  photoUrls,
}: {
  event: EventRow;
  reportFields: ReportField[];
  managerName: string | null;
  floorManagerName: string | null;
  guestCommitment: string | null;
  photoUrls?: string[];
}) {
  const eventTypeLabel = useEventTypeLabel();
  const values = event.report_values ?? {};
  const hasEndTimeField = reportFields.some((field) => field.key === REPORT_END_TIME_KEY);
  const fields: [string, string | number | null][] = [
    ["תאריך", formatDate(event.event_date)],
    ["שם הלקוח", event.name],
    ["סוג אירוע", eventTypeLabel(event.event_type)],
    ["שעת תחילת האירוע", formatTime(event.start_time)],
    ...(hasEndTimeField ? ([["שעת סיום האירוע", formatTime(values[REPORT_END_TIME_KEY] ?? null)]] as [string, string | null][]) : []),
    ["מינימום אורחים בהתחייבות", guestCommitment],
    ["מספר ילדים (התחייבות)", event.kids_meal_count],
    ["מנהל אירוע", managerName],
    ...shortFields(reportFields).map((field) => {
      const value = displayValue(field, values, floorManagerName);
      return [field.label, field.type === "time" ? formatTime(value) : value] as [string, string | null];
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">דוח סיכום אירוע</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {event.name} · {eventTypeLabel(event.event_type)} · {formatDate(event.event_date)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
        {fields.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 pb-1" style={{ borderBottom: "1px solid #e5e5e5" }}>
            <span style={{ color: "#737373" }}>{label}</span>
            <span className="font-medium">{value != null && value !== "" ? value : "—"}</span>
          </div>
        ))}
      </div>

      {longFields(reportFields).map((field) => {
        const value = displayValue(field, values, floorManagerName);
        return (
          value && (
            <div key={field.key} className="flex flex-col gap-1">
              <p className="text-sm font-bold">{field.label}</p>
              <p className="whitespace-pre-wrap text-[12.5px]">{value}</p>
            </div>
          )
        );
      })}
      {photoUrls && photoUrls.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: "1px solid #d4d4d4" }}>
          <p className="text-sm font-bold">תמונות</p>
          <div className="grid grid-cols-2 gap-3">
            {photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- captured by html2canvas, not rendered to the user
              <img
                key={url}
                src={url}
                alt=""
                className="max-h-[420px] w-full object-contain"
                style={{ border: "1px solid #d4d4d4" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
