"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMenu } from "./actions";
import { MENU_TYPE_LABELS } from "@/lib/labels";
import type { MenuType } from "@/lib/types";

export interface EditableSection {
  label: string;
  note: string;
  items: string[];
}

export interface EditableMenu {
  menu_type: MenuType;
  title: string;
  subtitle: string;
  linens_note: string;
  sections: EditableSection[];
  footer_notes: string[];
}

export const BLANK_MENU: EditableMenu = {
  menu_type: "buffet",
  title: "",
  subtitle: "",
  linens_note: "",
  sections: [{ label: "", note: "", items: [""] }],
  footer_notes: [],
};

const MENU_TYPES: MenuType[] = ["buffet", "plated"];
const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";
const smallBtnClass = "rounded border border-border-classic px-1.5 py-1 text-xs disabled:opacity-30";

export function MenuEditor({
  eventId,
  initial,
  warnings,
  onCancel,
  onSaved,
}: {
  eventId: string;
  initial: EditableMenu;
  warnings?: string[];
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<EditableMenu>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSection(index: number, patch: Partial<EditableSection>) {
    setMenu((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addSection() {
    setMenu((prev) => ({ ...prev, sections: [...prev.sections, { label: "", note: "", items: [""] }] }));
  }

  function removeSection(index: number) {
    setMenu((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  }

  function moveSection(index: number, dir: -1 | 1) {
    setMenu((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.sections.length) return prev;
      const sections = [...prev.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
  }

  function updateItem(sectionIndex: number, itemIndex: number, value: string) {
    setMenu((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, items: s.items.map((item, j) => (j === itemIndex ? value : item)) } : s,
      ),
    }));
  }

  function addItem(sectionIndex: number) {
    setMenu((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === sectionIndex ? { ...s, items: [...s.items, ""] } : s)),
    }));
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    setMenu((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, items: s.items.filter((_, j) => j !== itemIndex) } : s,
      ),
    }));
  }

  function moveItem(sectionIndex: number, itemIndex: number, dir: -1 | 1) {
    setMenu((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => {
        if (i !== sectionIndex) return s;
        const target = itemIndex + dir;
        if (target < 0 || target >= s.items.length) return s;
        const items = [...s.items];
        [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
        return { ...s, items };
      }),
    }));
  }

  function updateFooterNote(index: number, value: string) {
    setMenu((prev) => ({ ...prev, footer_notes: prev.footer_notes.map((n, i) => (i === index ? value : n)) }));
  }

  function addFooterNote() {
    setMenu((prev) => ({ ...prev, footer_notes: [...prev.footer_notes, ""] }));
  }

  function removeFooterNote(index: number) {
    setMenu((prev) => ({ ...prev, footer_notes: prev.footer_notes.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await saveMenu(eventId, {
        menu_type: menu.menu_type,
        title: menu.title || null,
        subtitle: menu.subtitle || null,
        linens_note: menu.linens_note || null,
        sections: menu.sections.map((s) => ({
          label: s.label,
          note: s.note || null,
          items: s.items,
        })),
        footer_notes: menu.footer_notes,
      });
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת התפריט");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {warnings && warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {warnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span className="font-medium">סוג תפריט</span>
          <select
            value={menu.menu_type}
            onChange={(e) => setMenu((prev) => ({ ...prev, menu_type: e.target.value as MenuType }))}
            className={inputClass}
          >
            {MENU_TYPES.map((type) => (
              <option key={type} value={type}>
                {MENU_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className="font-medium">מפות/מפיות</span>
          <input
            value={menu.linens_note}
            onChange={(e) => setMenu((prev) => ({ ...prev, linens_note: e.target.value }))}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">כותרת</span>
          <input
            value={menu.title}
            onChange={(e) => setMenu((prev) => ({ ...prev, title: e.target.value }))}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="font-medium">תת-כותרת</span>
          <input
            value={menu.subtitle}
            onChange={(e) => setMenu((prev) => ({ ...prev, subtitle: e.target.value }))}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {menu.sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <input
                  value={section.label}
                  onChange={(e) => updateSection(sectionIndex, { label: e.target.value })}
                  placeholder="כותרת הסעיף"
                  className={`${inputClass} flex-1 font-medium`}
                />
                <input
                  value={section.note}
                  onChange={(e) => updateSection(sectionIndex, { note: e.target.value })}
                  placeholder='הערה (למשל "2 לבחירה") - אופציונלי'
                  className={`${inputClass} flex-1`}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(sectionIndex, -1)}
                  disabled={sectionIndex === 0}
                  className={smallBtnClass}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(sectionIndex, 1)}
                  disabled={sectionIndex === menu.sections.length - 1}
                  className={smallBtnClass}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(sectionIndex)}
                  className="rounded border border-red-300 px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  מחיקת סעיף
                </button>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5 ps-2">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-center gap-2">
                  <span className="text-foreground/40">•</span>
                  <input
                    value={item}
                    onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => moveItem(sectionIndex, itemIndex, -1)}
                    disabled={itemIndex === 0}
                    className={smallBtnClass}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(sectionIndex, itemIndex, 1)}
                    disabled={itemIndex === section.items.length - 1}
                    className={smallBtnClass}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(sectionIndex, itemIndex)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    הסרה
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => addItem(sectionIndex)}
              className="self-start text-xs text-accent hover:underline"
            >
              + הוספת מנה
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSection}
          className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
        >
          + הוספת סעיף
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-3">
        <p className="text-sm font-medium">הערות תחתונות</p>
        <ul className="flex flex-col gap-1.5">
          {menu.footer_notes.map((note, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-foreground/40">•</span>
              <input
                value={note}
                onChange={(e) => updateFooterNote(i, e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button type="button" onClick={() => removeFooterNote(i)} className="text-xs text-red-600 hover:underline">
                הסרה
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addFooterNote} className="self-start text-xs text-accent hover:underline">
          + הוספת הערה
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border-classic pt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "שומר..." : "שמירת תפריט"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-foreground/60 hover:underline">
            ביטול
          </button>
        )}
      </div>
    </div>
  );
}
