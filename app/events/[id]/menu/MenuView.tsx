"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MenuImportWizard } from "./MenuImportWizard";
import { MenuEditor, BLANK_MENU, type EditableMenu } from "./MenuEditor";
import { MenuPrintable } from "@/components/MenuPrintable";
import { PdfExportButton } from "@/components/PdfExportButton";
import { deleteMenu } from "./actions";
import { MENU_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { EventMenuRow, EventRow } from "@/lib/types";

function menuToEditable(menu: EventMenuRow): EditableMenu {
  return {
    menu_type: menu.menu_type,
    title: menu.title ?? "",
    subtitle: menu.subtitle ?? "",
    linens_note: menu.linens_note ?? "",
    sections:
      menu.sections.length > 0
        ? menu.sections.map((s) => ({ label: s.label, note: s.note ?? "", items: s.items.length > 0 ? s.items : [""] }))
        : [{ label: "", note: "", items: [""] }],
    footer_notes: menu.footer_notes,
  };
}

type Mode = "view" | "edit" | "import";

export function MenuView({
  eventId,
  event,
  menu,
  canWrite,
}: {
  eventId: string;
  event: EventRow;
  menu: EventMenuRow | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("למחוק את התפריט הקיים?")) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteMenu(eventId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת התפריט");
    } finally {
      setIsDeleting(false);
    }
  }

  if (mode === "import") {
    return <MenuImportWizard eventId={eventId} onCancel={() => setMode("view")} onSaved={() => setMode("view")} />;
  }

  if (mode === "edit") {
    return (
      <MenuEditor
        eventId={eventId}
        initial={menu ? menuToEditable(menu) : BLANK_MENU}
        onCancel={() => setMode("view")}
        onSaved={() => setMode("view")}
      />
    );
  }

  if (!menu) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/60">טרם הוגדר תפריט לאירוע זה.</p>
        {canWrite && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("import")}
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              ייבוא מקובץ Word
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="self-start rounded-full border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
            >
              יצירה ידנית
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <PdfExportButton
          filename={`תפריט-${event.name}.pdf`}
          eventLabel={`${event.name} · ${formatDate(event.event_date)}`}
          showSignature={false}
        >
          <MenuPrintable menu={menu} event={event} />
        </PdfExportButton>
        {canWrite && (
          <>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
            >
              עריכה
            </button>
            <button
              type="button"
              onClick={() => setMode("import")}
              className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
            >
              ייבוא מחדש
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-full border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? "מוחק..." : "מחיקת תפריט"}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border-classic bg-surface p-4">
        {menu.title && <h2 className="font-serif text-xl font-bold">{menu.title}</h2>}
        {menu.subtitle && <p className="text-sm text-foreground/70">{menu.subtitle}</p>}
        <p className="text-xs text-foreground/50">
          סוג תפריט: {MENU_TYPE_LABELS[menu.menu_type]}
          {menu.linens_note && ` · ${menu.linens_note}`}
        </p>

        <div className="flex flex-col gap-3">
          {menu.sections.map((section, i) => (
            <div key={i}>
              <p className="font-semibold">
                {section.label}
                {section.note && <span className="font-normal text-foreground/60"> ({section.note})</span>}
              </p>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm text-foreground/85">
                {section.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {menu.footer_notes.length > 0 && (
          <ul className="flex flex-col gap-0.5 border-t border-border-classic pt-3 text-xs text-foreground/60">
            {menu.footer_notes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
