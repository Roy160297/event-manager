import type { ClosingChecklistCategory } from "@/lib/closingChecklist";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventType } from "@/lib/types";

// Shared print layout for all five closing checklists (event manager, floor
// manager, bar, kitchen, barista) - captured via html2canvas by PdfExportButton
// or, for the bulk "send all by email" flow, rendered offscreen directly.
export function ChecklistPrintable({
  title,
  eventName,
  eventType,
  eventDate,
  categories,
  checked,
  note,
  noteLabel,
  showCategoryLabels = false,
}: {
  title: string;
  eventName: string;
  eventType: EventType | null;
  eventDate: string | null;
  categories: ClosingChecklistCategory[];
  checked: Set<string>;
  note?: string | null;
  noteLabel?: string;
  // The general event-manager checklist has several distinctly-named
  // categories (yard, hall, offices...); the four role checklists are each a
  // single flat category whose label just repeats the checklist's own title.
  showCategoryLabels?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">{title}</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {eventName} · {eventType ? EVENT_TYPE_LABELS[eventType] : "—"} · {formatDate(eventDate)}
        </div>
      </div>
      {categories.map((category) => (
        <div key={category.key} className="flex flex-col gap-1.5">
          {showCategoryLabels && <p className="text-sm font-bold underline">{category.label}</p>}
          <ul className="flex flex-col gap-1">
            {category.items.map((item) => (
              <li key={item.key} className="flex items-start gap-2 text-[12.5px]">
                <span
                  className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] text-[10px] leading-none"
                  style={{ border: "1px solid #737373" }}
                >
                  {checked.has(item.key) ? "✓" : ""}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {note != null && (
        <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid #d4d4d4" }}>
          <p className="text-sm font-bold">{noteLabel}</p>
          <p className="text-[12.5px]" style={{ color: note ? "#000000" : "#737373" }}>
            {note || (noteLabel === "רשימת חוסרים" ? "אין חוסרים" : "אין הערות")}
          </p>
        </div>
      )}
    </div>
  );
}
