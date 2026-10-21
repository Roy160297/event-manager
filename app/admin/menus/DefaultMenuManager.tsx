"use client";

import { useState } from "react";
import { MenuEditor, type EditableMenu } from "@/app/events/[id]/menu/MenuEditor";
import { MenuImportWizard } from "@/app/events/[id]/menu/MenuImportWizard";
import { MENU_TYPE_LABELS } from "@/lib/labels";
import type { DefaultMenu } from "@/lib/defaultMenus";
import type { MenuSaveData } from "@/app/events/[id]/menu/actions";
import { saveDefaultMenu } from "./actions";

function toEditable(menu: DefaultMenu): EditableMenu {
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

// One of the venue's default menus: shown as it will be loaded into an event,
// with a button to edit it by hand and one to rebuild it from a sample Word menu.
export function DefaultMenuManager({ menu, canEdit }: { menu: DefaultMenu; canEdit: boolean }) {
  const [mode, setMode] = useState<Mode>("view");
  // The type of a default menu is fixed - whatever the editor or the AI guesses.
  const save = (data: MenuSaveData) => saveDefaultMenu(menu.menu_type, { ...data, menu_type: menu.menu_type });
  const empty = menu.sections.length === 0;

  if (mode === "import") {
    return (
      <MenuImportWizard
        save={save}
        lockType
        heading={`העלאת תפריט לדוגמה (${MENU_TYPE_LABELS[menu.menu_type]})`}
        onCancel={() => setMode("view")}
        onSaved={() => setMode("view")}
      />
    );
  }

  if (mode === "edit") {
    return (
      <div className="rounded-lg border border-border-classic bg-surface p-4">
        <MenuEditor initial={toEditable(menu)} save={save} lockType onCancel={() => setMode("view")} onSaved={() => setMode("view")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-lg font-bold">תפריט {MENU_TYPE_LABELS[menu.menu_type]}</p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
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
              העלאת קובץ Word לדוגמה
            </button>
          </div>
        )}
      </div>

      {empty ? (
        <p className="text-sm text-foreground/60">עדיין לא הוגדר תפריט ברירת מחדל מהסוג הזה.</p>
      ) : (
        <>
          {menu.title && <h2 className="font-serif text-xl font-bold">{menu.title}</h2>}
          {menu.subtitle && <p className="text-sm text-foreground/70">{menu.subtitle}</p>}
          {menu.linens_note && <p className="text-xs text-foreground/50">{menu.linens_note}</p>}
          <div className="flex flex-col gap-2">
            {menu.sections.map((section, i) => (
              <div key={i}>
                <p className="text-sm font-semibold">
                  {section.label}
                  {section.note && <span className="font-normal text-foreground/60"> ({section.note})</span>}
                </p>
                <ul className="mt-0.5 flex flex-col gap-0.5 text-sm text-foreground/85">
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
        </>
      )}
    </div>
  );
}
