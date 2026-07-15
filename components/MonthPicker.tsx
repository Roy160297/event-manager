import Link from "next/link";
import { MONTH_LABELS } from "@/lib/labels";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function MonthPicker({ year, month }: { year: number; month: number }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-border-classic bg-surface p-3 sm:w-44">
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
      <div className="flex flex-col gap-1">
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
