import Link from "next/link";
import { MONTH_LABELS } from "@/lib/labels";
import { MonthSelect } from "./MonthSelect";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function MonthPicker({ year, month }: { year: number; month: number }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-border-classic bg-surface p-2 sm:w-44 sm:p-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${year - 1}-${pad(month)}`}
          className="rounded-full border border-border-classic px-2 py-1 text-sm hover:bg-accent-soft"
        >
          ‹
        </Link>
        <span className="font-medium">{year}</span>
        <Link
          href={`/calendar?month=${year + 1}-${pad(month)}`}
          className="rounded-full border border-border-classic px-2 py-1 text-sm hover:bg-accent-soft"
        >
          ›
        </Link>
      </div>
      <MonthSelect year={year} month={month} />
      {/* Phones get the dropdown above instead of this list, which pushed the calendar below the fold. */}
      <div className="hidden flex-col gap-1 sm:flex">
        {MONTH_LABELS.map((label, index) => {
          const m = index + 1;
          const isActive = m === month;
          return (
            <Link
              key={label}
              href={`/calendar?month=${year}-${pad(m)}`}
              className={
                isActive
                  ? "rounded-md bg-accent px-3 py-1.5 text-center text-sm font-semibold text-accent-foreground"
                  : "rounded-md px-3 py-1.5 text-center text-sm text-accent hover:bg-accent-soft"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
