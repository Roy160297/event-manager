import { EVENT_TYPE_LABELS, formatDate, formatTime } from "@/lib/labels";
import type { EventRow } from "@/lib/types";

export function EventSummaryReportPrintable({
  event,
  managerName,
  guestCommitment,
  photoUrls,
}: {
  event: EventRow;
  managerName: string | null;
  guestCommitment: string | null;
  photoUrls?: string[];
}) {
  const fields: [string, string | number | null][] = [
    ["תאריך", formatDate(event.event_date)],
    ["שם הלקוח", event.name],
    ["סוג אירוע", EVENT_TYPE_LABELS[event.event_type]],
    ["שעת תחילת האירוע", formatTime(event.start_time)],
    ["שעת סיום האירוע", formatTime(event.report_end_time)],
    ["מינימום אורחים בהתחייבות", guestCommitment],
    ["מנהל אירוע", managerName],
    ["חברת הפקה", event.production_company],
    ["שעת יציאה מהאולם", formatTime(event.exit_time)],
    ["כמות אורחים סופית - קאונטר", event.final_guest_count_counter],
    ["כמות אורחים סופית - אייפלן", event.final_guest_count_iplan],
    ["כמות רזרבה שנפתחו", event.reserve_opened_count],
    ["מנהל בר", event.bar_manager_name],
    ["כמות ברמנים", event.bartender_count],
    ["מנהל פלור", event.floor_manager_name],
    ["כמות מלצרים", event.waiter_count],
    ["כמות טבחים", event.cook_count],
    ["כמות מנקי מטבח", event.kitchen_dishwasher_count],
    ["כמות שוטפי כלים", event.dishwasher_count],
    ["כמות מאבטחים", event.security_guard_count],
    ["שעות מנקה אולם", event.hall_cleaner_hours],
    ["שעות מנקה שירותים", event.restroom_cleaner_hours],
    ["שעות מנקי מטבח", event.kitchen_dishwasher_hours],
    ["שעות שוטפי כלים", event.dishwasher_hours],
    ["שעות מאבטחים", event.security_guard_hours],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">דוח סיכום אירוע</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {event.name} · {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
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

      {event.report_summary && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">סיכום האירוע</p>
          <p className="whitespace-pre-wrap text-[12.5px]">{event.report_summary}</p>
        </div>
      )}
      {event.report_general_notes && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">הערות כלליות</p>
          <p className="whitespace-pre-wrap text-[12.5px]">{event.report_general_notes}</p>
        </div>
      )}
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
