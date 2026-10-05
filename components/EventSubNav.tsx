"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_NAV_CLASS, tabLinkClass } from "./tabStyles";

const SUB_NAV = [
  { segment: "", label: "סקירה" },
  { segment: "tasks", label: "משימות וצ'קליסטים" },
  { segment: "timeline", label: "לוח זמנים" },
  { segment: "guests", label: "אורחים" },
  { segment: "staffing", label: "סקיצה + מלצרים" },
  { segment: "menu", label: "תפריט" },
];

export function EventSubNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  return (
    <nav className={TAB_NAV_CLASS}>
      {SUB_NAV.map((item) => {
        const href = `${base}/${item.segment}`;
        const isActive = item.segment === "" ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);
        return (
          <Link
            key={item.segment}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={tabLinkClass(isActive)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
