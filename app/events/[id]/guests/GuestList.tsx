"use client";

import { Fragment, useMemo, useState } from "react";
import { deleteAllGuests, deleteGuest, updateGuest } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import type { GuestRow } from "@/lib/types";

const NO_TABLE = "__none__";
const ALL_TABLES = "";

export function GuestList({ guests, eventId, canWrite }: { guests: GuestRow[]; eventId: string; canWrite: boolean }) {
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState(ALL_TABLES);

  const tables = useMemo(
    () =>
      Array.from(new Set(guests.map((g) => g.seating_table).filter((t): t is string => !!t))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [guests],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    return guests.filter((guest) => {
      if (q && !guest.name.includes(q)) return false;
      if (tableFilter === NO_TABLE && guest.seating_table) return false;
      if (tableFilter !== ALL_TABLES && tableFilter !== NO_TABLE && guest.seating_table !== tableFilter) return false;
      return true;
    });
  }, [guests, query, tableFilter]);

  const cellClass = "border-b border-border-classic p-2";
  const fieldClass = "rounded-md border border-border-classic bg-surface px-2 py-1 text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>חיפוש אורח לפי שם</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='לדוגמה: "אביב אדטו"'
              className="max-w-xs rounded-md border border-border-classic bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>סינון לפי שולחן</span>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="rounded-md border border-border-classic bg-surface px-3 py-2"
            >
              <option value={ALL_TABLES}>כל השולחנות</option>
              <option value={NO_TABLE}>ללא שולחן משובץ</option>
              {tables.map((table) => (
                <option key={table} value={table}>
                  שולחן {table}
                </option>
              ))}
            </select>
          </label>
        </div>

        {canWrite && guests.length > 0 && (
          <form action={async () => { await deleteAllGuests(eventId); }}>
            <ConfirmSubmitButton
              message="למחוק את כל רשימת האורחים של האירוע? לא ניתן לשחזר פעולה זו."
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              מחק את כל רשימת האורחים
            </ConfirmSubmitButton>
          </form>
        )}
      </div>

      <p className="text-sm text-foreground/60">
        מציג {filtered.length} מתוך {guests.length} אורחים
      </p>

      {filtered.length === 0 && <p className="text-foreground/60">לא נמצאו אורחים תואמים.</p>}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-border-classic p-2 text-right">שם</th>
                <th className="border-b border-border-classic p-2 text-right">סועדים</th>
                <th className="border-b border-border-classic p-2 text-right">שולחן</th>
                <th className="border-b border-border-classic p-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <Fragment key={guest.id}>
                  <tr>
                    <td className={cellClass}>{guest.name}</td>
                    <td className={cellClass}>{guest.party_size}</td>
                    <td className={cellClass}>{guest.seating_table ?? "—"}</td>
                    <td className={cellClass}>
                      {canWrite && (
                        <form action={async () => { await deleteGuest(eventId, guest.id); }}>
                          <button
                            type="submit"
                            title="מחק אורח"
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">מחק</span>
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                  {canWrite && (
                    <tr>
                      <td colSpan={4} className={`${cellClass} bg-accent-soft/50`}>
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-foreground/60">ערוך אורח</summary>
                          <SaveDetailsForm
                            action={(formData) => updateGuest(eventId, guest.id, formData)}
                            className="mt-2 flex flex-wrap items-end gap-2"
                          >
                            <label className="flex flex-col gap-1 text-xs">
                              <span>שם</span>
                              <input name="name" defaultValue={guest.name} required className={fieldClass} />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>סועדים</span>
                              <input
                                type="number"
                                name="party_size"
                                min={1}
                                defaultValue={guest.party_size}
                                className={`${fieldClass} w-20`}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>שולחן</span>
                              <input name="seating_table" defaultValue={guest.seating_table ?? ""} className={fieldClass} />
                            </label>
                            <button
                              type="submit"
                              className="rounded-full border border-border-classic px-3 py-1.5 text-sm hover:bg-accent-soft"
                            >
                              שמור
                            </button>
                          </SaveDetailsForm>
                        </details>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
