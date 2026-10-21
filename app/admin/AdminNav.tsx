"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_NAV_CLASS, tabLinkClass } from "@/components/tabStyles";

const LINKS = [
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/roles", label: "תפקידים והרשאות" },
  { href: "/admin/iplan", label: "סנכרון iPlan" },
];

const VENUE_LINKS = [
  { href: "/admin/venue", label: "הגדרות האולם" },
  { href: "/admin/checklists", label: "צ'קליסטים" },
  { href: "/admin/schedules", label: "לוחות זמנים" },
  { href: "/admin/guides", label: "מדריכים" },
];

export function AdminNav({ showVenue = false }: { showVenue?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={`mt-3 ${TAB_NAV_CLASS}`}>
      {(showVenue ? [...LINKS, ...VENUE_LINKS] : LINKS).map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={tabLinkClass(isActive)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
