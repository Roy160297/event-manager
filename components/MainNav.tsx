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
                    ? "flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
                    : "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm text-foreground/70 hover:bg-accent-soft hover:text-foreground"
                }
              >
                <NavIcon name={link.icon} className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
