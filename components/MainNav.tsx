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
  showEventManagementDex = false,
}: {
  showAdmin?: boolean;
  showCoupleMeeting?: boolean;
  showEventManagementDex?: boolean;
}) {
  const pathname = usePathname();
  const extraLinks = [];
  if (showCoupleMeeting) extraLinks.push({ href: "/couple-meeting", label: "פגישה עם זוג" });
  if (showEventManagementDex) extraLinks.push({ href: "/event-management-dex", label: "ניהול אירוע (Dex)" });

  let links = [...NAV_LINKS.slice(0, 2), ...extraLinks, ...NAV_LINKS.slice(2)];
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
