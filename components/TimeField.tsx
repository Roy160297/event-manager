"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const selectClass = "rounded-md border border-border-classic bg-surface px-2 py-2 text-sm";

function parseTime(value: string) {
  const [h, m] = value.split(":");
  return { h: h ?? "", m: m ?? "" };
}

// Native <input type="time"> renders using the device's own OS locale on
// mobile (e.g. Android ignores the page's lang/dir entirely), so a phone set
// to a 12-hour region shows "07:30 PM" no matter what we do to the input
// itself. Two plain <select> dropdowns give us full control over the
// displayed format regardless of device settings.
export function TimeSelects({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { h, m } = parseTime(value);

  return (
    <div className="flex items-center gap-1" dir="ltr">
      <select
        aria-label="שעה"
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)}
        className={selectClass}
      >
        <option value="" disabled>
          --
        </option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span>:</span>
      <select
        aria-label="דקה"
        value={m}
        onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)}
        className={selectClass}
      >
        <option value="" disabled>
          --
        </option>
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </div>
  );
}

const nativeInputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";

// Native <input type="time"> actually renders fine on desktop browsers (the
// icon + compact "19:30" look), so the OS-locale problem above only bites on
// phones. Show the real native input on wider screens and fall back to the
// select-based picker only below the sm breakpoint.
export function TimeInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <>
      <input
        type="time"
        lang="he"
        step={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`hidden sm:block ${className ?? nativeInputClass}`}
      />
      <div className="sm:hidden">
        <TimeSelects value={value} onChange={onChange} />
      </div>
    </>
  );
}

// Drop-in replacement for <input type="time" name="..." defaultValue="..." />
// inside a plain <form action={serverAction}> - keeps its own state and
// mirrors it into a hidden input so FormData picks it up on submit.
export function TimeField({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <TimeInput value={value} onChange={setValue} className={className} />
    </>
  );
}
