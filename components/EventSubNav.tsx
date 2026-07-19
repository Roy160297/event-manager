"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_NAV = [
  { segment: "", label: "סקירה" },
  { segment: "tasks", label: "משימות" },
  { segment: "timeline", label: "לוח זמנים" },
  { segment: "guests", label: "אורחים" },
  { segment: "staffing", label: "שיבוץ מלצרים" },
];

export function EventSubNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  return (
    <nav className="flex gap-1 border-b border-border-classic">
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
                ? "border-b-2 border-accent px-3 py-2 text-sm font-semibold text-accent"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-foreground/70 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
