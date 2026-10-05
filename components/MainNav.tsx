"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "./NavIcons";

interface NavLink {
  href: string;
  label: string;
  icon: NavIconName;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "אירועים", icon: "events" },
  { href: "/waiters", label: "מלצרים", icon: "waiters" },
];

export function MainNav({
  showAdmin = false,
  showCalendar = false,
  showCoupleMeeting = false,
  showEventManagementDex = false,
  showMyTasks = false,
  showChecklistNotes = false,
  showPushReminders = false,
}: {
  showAdmin?: boolean;
  showCalendar?: boolean;
  showCoupleMeeting?: boolean;
  showEventManagementDex?: boolean;
  showMyTasks?: boolean;
  showChecklistNotes?: boolean;
  showPushReminders?: boolean;
}) {
  const pathname = usePathname();
  const extraLinks: NavLink[] = [];
  if (showCalendar) extraLinks.push({ href: "/calendar", label: "יומן", icon: "calendar" });
  if (showMyTasks) extraLinks.push({ href: "/my-tasks", label: "המשימות שלי", icon: "myTasks" });
  if (showChecklistNotes) extraLinks.push({ href: "/checklist-notes", label: "הערות וסיכומים", icon: "notes" });
  if (showCoupleMeeting) extraLinks.push({ href: "/couple-meeting", label: "פגישה עם זוג", icon: "couple" });
  if (showEventManagementDex) extraLinks.push({ href: "/event-management-dex", label: 'סד"פ ניהול אירוע', icon: "dex" });
  if (showPushReminders) extraLinks.push({ href: "/push-reminders", label: "התראות ותזכורות", icon: "reminders" });

  let links = [NAV_LINKS[0], ...extraLinks, NAV_LINKS[1]];
  if (showAdmin) links = [...links, { href: "/admin", label: "ניהול", icon: "admin" }];

  return (
    <nav>
      <ul className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-1">
        {links.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "flex flex-col items-center gap-1 rounded-xl bg-accent px-1 py-2 text-center text-xs font-semibold leading-tight text-accent-foreground sm:flex-row sm:gap-1.5 sm:whitespace-nowrap sm:rounded-full sm:px-3 sm:py-1.5 sm:text-sm"
                    : "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-xs leading-tight text-foreground/70 hover:bg-accent-soft hover:text-foreground sm:flex-row sm:gap-1.5 sm:whitespace-nowrap sm:rounded-full sm:px-3 sm:py-1.5 sm:text-sm"
                }
              >
                <NavIcon name={link.icon} className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
