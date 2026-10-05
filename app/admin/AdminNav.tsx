"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_NAV_CLASS, tabLinkClass } from "@/components/tabStyles";

const LINKS = [
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/roles", label: "תפקידים והרשאות" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={`mt-3 ${TAB_NAV_CLASS}`}>
      {LINKS.map((link) => {
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
