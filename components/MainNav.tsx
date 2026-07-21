"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "אירועים" },
  { href: "/calendar", label: "יומן" },
  { href: "/waiters", label: "מלצרים" },
];

export function MainNav({
  showAdmin = false,
  showCoupleMeeting = false,
}: {
  showAdmin?: boolean;
  showCoupleMeeting?: boolean;
}) {
  const pathname = usePathname();
  let links = NAV_LINKS;
  if (showCoupleMeeting) {
    links = [...links.slice(0, 2), { href: "/couple-meeting", label: "פגישה עם זוג" }, ...links.slice(2)];
  }
  if (showAdmin) links = [...links, { href: "/admin", label: "ניהול" }];

  return (
    <nav>
      <ul className="flex gap-2">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
                    : "rounded-full px-4 py-1.5 text-sm text-foreground/70 hover:bg-accent-soft hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
