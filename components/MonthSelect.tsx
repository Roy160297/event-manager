"use client";

import { useRouter } from "next/navigation";
import { MONTH_LABELS } from "@/lib/labels";

// Phone-only month jump for the calendar page: a single-line dropdown in
// place of the full month list, which pushed the calendar below the fold.
export function MonthSelect({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  return (
    <select
      aria-label="בחירת חודש"
      value={month}
      onChange={(e) => router.push(`/calendar?month=${year}-${String(e.target.value).padStart(2, "0")}`)}
      className="w-full rounded-md border border-border-classic bg-surface px-3 py-2 text-sm sm:hidden"
    >
      {MONTH_LABELS.map((label, index) => (
        <option key={label} value={index + 1}>
          {label}
        </option>
      ))}
    </select>
  );
}
