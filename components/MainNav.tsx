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
      {/* Below sm: a fixed 4-column grid, so links line up in even rows
          instead of flex-wrap's uneven row lengths (a long label eating a
          whole row while a short one leaves a gap next to it - reads like a
          lopsided column on a phone). sm+: back to a plain single wrapping
          row, since it always fits on desktop-width screens anyway. */}
      <ul className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-2">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "block rounded-full bg-accent px-2 py-1.5 text-center text-xs font-semibold text-accent-foreground sm:whitespace-nowrap sm:px-4 sm:text-sm"
                    : "block rounded-full px-2 py-1.5 text-center text-xs text-foreground/70 hover:bg-accent-soft hover:text-foreground sm:whitespace-nowrap sm:px-4 sm:text-sm"
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
