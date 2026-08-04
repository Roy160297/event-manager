"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_NAV = [
  { segment: "", label: "סקירה" },
  { segment: "tasks", label: "משימות" },
  { segment: "timeline", label: "לוח זמנים" },
  { segment: "guests", label: "אורחים" },
  { segment: "staffing", label: "סקיצה לאירוע" },
  { segment: "menu", label: "תפריט" },
];

export function EventSubNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border-classic pb-1">
      {SUB_NAV.map((item) => {
        const href = `${base}/${item.segment}`;
        const isActive = item.segment === "" ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);
        return (
          <Link
            key={item.segment}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-md bg-accent-soft px-3 py-2 text-sm font-semibold text-accent"
                : "rounded-md bg-background px-3 py-2 text-sm text-foreground/85 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
