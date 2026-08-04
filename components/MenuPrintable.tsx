import { EVENT_TYPE_LABELS, MENU_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventMenuRow, EventRow } from "@/lib/types";

export function MenuPrintable({ menu, event }: { menu: EventMenuRow; event: EventRow }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-baseline justify-between pb-2" style={{ borderBottom: "1px solid #d4d4d4" }}>
        <h1 className="font-serif text-xl font-bold">{menu.title || "תפריט"}</h1>
        <div className="text-sm" style={{ color: "#525252" }}>
          {event.name} · {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
        </div>
      </div>

      {menu.subtitle && <p className="text-[12.5px]" style={{ color: "#525252" }}>{menu.subtitle}</p>}

      <p className="text-[12.5px]" style={{ color: "#737373" }}>
        סוג תפריט: {MENU_TYPE_LABELS[menu.menu_type]}
        {menu.linens_note && ` · ${menu.linens_note}`}
      </p>

      <div className="flex flex-col gap-3">
        {menu.sections.map((section, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-sm font-bold">
              {section.label}
              {section.note && (
                <span className="font-normal" style={{ color: "#737373" }}>
                  {" "}
                  ({section.note})
                </span>
              )}
            </p>
            <ul className="flex flex-col gap-0.5 text-[12.5px]">
              {section.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {menu.footer_notes.length > 0 && (
        <ul
          className="flex flex-col gap-0.5 pt-2 text-[11.5px]"
          style={{ borderTop: "1px solid #e5e5e5", color: "#737373" }}
        >
          {menu.footer_notes.map((note, i) => (
            <li key={i}>• {note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
