"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "אירועים" },
  { href: "/waiters", label: "מלצרים" },
];

export function MainNav({
  showAdmin = false,
  showCalendar = false,
  showCoupleMeeting = false,
  showEventManagementDex = false,
  showMyTasks = false,
  showChecklistNotes = false,
}: {
  showAdmin?: boolean;
  showCalendar?: boolean;
  showCoupleMeeting?: boolean;
  showEventManagementDex?: boolean;
  showMyTasks?: boolean;
  showChecklistNotes?: boolean;
}) {
  const pathname = usePathname();
  const extraLinks = [];
  if (showCalendar) extraLinks.push({ href: "/calendar", label: "יומן" });
  if (showMyTasks) extraLinks.push({ href: "/my-tasks", label: "המשימות שלי" });
  if (showChecklistNotes) extraLinks.push({ href: "/checklist-notes", label: "הערות וסיכומים" });
  if (showCoupleMeeting) extraLinks.push({ href: "/couple-meeting", label: "פגישה עם זוג" });
  if (showEventManagementDex) extraLinks.push({ href: "/event-management-dex", label: 'סד"פ ניהול אירוע' });

  let links = [NAV_LINKS[0], ...extraLinks, NAV_LINKS[1]];
  if (showAdmin) links = [...links, { href: "/admin", label: "ניהול" }];

  return (
    <nav>
      <ul className="flex flex-wrap justify-center gap-2">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
                    : "whitespace-nowrap rounded-full px-4 py-1.5 text-sm text-foreground/70 hover:bg-accent-soft hover:text-foreground"
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
