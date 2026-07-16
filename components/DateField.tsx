"use client";

import { useState } from "react";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => String(CURRENT_YEAR - 3 + i));

const selectClass = "rounded-md border border-border-classic bg-surface px-2 py-2 text-sm";

function parseDate(value: string) {
  const [y, m, d] = value.split("-");
  return { y: y ?? "", m: m ?? "", d: d ?? "" };
}

function combine(y: string, m: string, d: string) {
  return y && m && d ? `${y}-${m}-${d}` : "";
}

// Native <input type="date"> renders using the device's own OS locale on
// mobile (same issue as the time inputs), so a phone set to a different
// region can show mm/dd/yyyy instead of dd/mm/yyyy no matter what we do to
// the input itself. Three plain <select> dropdowns give us full control over
// the displayed order/format regardless of device settings.
//
// Unlike hour/minute, day/month/year have no sensible default to fall back
// on while the other two are still unset, so a partial pick (e.g. day only)
// can't be turned into a valid combined date yet. Local state tracks the
// three parts independently so picking one doesn't blank out the others
// while waiting for the rest - the parent only hears about a real value once
// all three are chosen.
export function DateSelects({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(() => parseDate(value));

  function update(next: Partial<typeof local>) {
    const merged = { ...local, ...next };
    setLocal(merged);
    onChange(combine(merged.y, merged.m, merged.d));
  }

  return (
    <div className="flex items-center gap-1" dir="ltr">
      <select
        aria-label="יום"
        value={local.d}
        onChange={(e) => update({ d: e.target.value })}
        className={selectClass}
      >
        <option value="" disabled>
          יום
        </option>
        {DAYS.map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
      <span>/</span>
      <select
        aria-label="חודש"
        value={local.m}
        onChange={(e) => update({ m: e.target.value })}
        className={selectClass}
      >
        <option value="" disabled>
          חודש
        </option>
        {MONTHS.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <span>/</span>
      <select
        aria-label="שנה"
        value={local.y}
        onChange={(e) => update({ y: e.target.value })}
        className={selectClass}
      >
        <option value="" disabled>
          שנה
        </option>
        {YEARS.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
    </div>
  );
}

// Drop-in replacement for <input type="date" name="..." defaultValue="..." />
// inside a plain <form action={serverAction}> - keeps its own state and
// mirrors it into a hidden input so FormData picks it up on submit.
export function DateField({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DateSelects value={value} onChange={setValue} />
    </>
  );
}
