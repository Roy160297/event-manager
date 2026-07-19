"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/roles", label: "תפקידים והרשאות" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-1 border-b border-border-classic">
      {LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "border-b-2 border-accent px-3 py-2 text-sm font-medium text-accent"
                : "border-b-2 border-transparent px-3 py-2 text-sm hover:text-accent"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
