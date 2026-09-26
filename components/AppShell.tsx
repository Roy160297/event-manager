"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MainNav } from "@/components/MainNav";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { EventSwitcher } from "@/components/EventSwitcher";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { RoyLogo } from "@/components/RoyLogo";
import type { EventRow } from "@/lib/types";

interface StaffSummary {
  name: string;
}

// Everything that used to live directly in the root Server Component layout
// (header, nav, footer) moved into this Client Component so it can branch on
// the current path: the private-events owner gets a completely separate app
// shell (own header/footer, mint theme, no venue nav or event switcher) once
// they're anywhere under /private-events, rather than the venue's chrome
// with just the page content swapped out. All the data these two shells need
// is still fetched server-side in app/layout.tsx and passed in as props.
export function AppShell({
  staff,
  isPrivateEventsOwner,
  navProps,
  switcherEvents,
  switcherManagers,
  switcherDefaultManagerId,
  signOutAction,
  children,
}: {
  staff: StaffSummary | null;
  isPrivateEventsOwner: boolean;
  navProps: {
    showAdmin: boolean;
    showCalendar: boolean;
    showCoupleMeeting: boolean;
    showEventManagementDex: boolean;
    showMyTasks: boolean;
    showPushReminders: boolean;
    showChecklistNotes: boolean;
  };
  switcherEvents: Pick<EventRow, "id" | "name" | "event_date" | "event_type" | "manager_id">[];
  switcherManagers: { id: string; name: string }[];
  switcherDefaultManagerId: string | null;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPrivateMode = isPrivateEventsOwner && pathname.startsWith("/private-events");

  const workspaceSwitcher = isPrivateEventsOwner && <WorkspaceSwitcher isPrivateMode={isPrivateMode} />;

  const accountBlock = staff && (
    <div className="flex flex-wrap items-center gap-2.5 text-sm text-foreground/70">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {staff.name.trim().charAt(0)}
      </span>
      <span className="whitespace-nowrap">{staff.name}</span>
      <PushNotificationManager />
      {workspaceSwitcher}
      <form action={signOutAction}>
        <button
          type="submit"
          className="whitespace-nowrap rounded-full border border-border-classic bg-surface px-3 py-1 text-xs font-medium text-foreground/70 hover:border-accent hover:text-accent"
        >
          התנתקות
        </button>
      </form>
    </div>
  );

  if (isPrivateMode) {
    const privateTitleLink = (
      <Link href="/private-events" className="flex items-center gap-2.5">
        <RoyLogo className="h-14 w-14 shrink-0" />
        <span className="font-serif text-2xl font-bold text-foreground">האירועים הפרטיים שלי</span>
      </Link>
    );
    const PRIVATE_NAV_LINKS = [
      { href: "/private-events", label: "אירועים" },
      { href: "/private-events/my-tasks", label: "המשימות שלי" },
    ];
    const privateNavEl = (
      <nav>
        <ul className="flex flex-wrap justify-center gap-2">
          {PRIVATE_NAV_LINKS.map((link) => {
            const isActive = link.href === "/private-events" ? pathname === link.href : pathname.startsWith(link.href);
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

    return (
      <div className="theme-private flex min-h-screen flex-col bg-background">
        <header className="border-b border-border-classic bg-background">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="flex flex-col gap-2 sm:hidden">
              <div className="flex items-center justify-between gap-4">
                {accountBlock}
                {privateTitleLink}
              </div>
              {privateNavEl}
            </div>

            <div className="hidden sm:grid sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-4 sm:gap-y-2">
              <div className="justify-self-start">{accountBlock}</div>
              <div className="flex min-w-0 flex-col items-center gap-y-2">
                {privateTitleLink}
                {privateNavEl}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border-classic bg-background px-4 py-4 text-center text-xs text-foreground/50">
          © {new Date().getFullYear()} רועי פוריאן. כל הזכויות שמורות.
        </footer>
      </div>
    );
  }

  const titleEl = <span className="font-serif text-2xl font-bold text-accent">ניהול אירועים</span>;

  const navEl = staff && (
    <MainNav
      showAdmin={navProps.showAdmin}
      showCalendar={navProps.showCalendar}
      showCoupleMeeting={navProps.showCoupleMeeting}
      showEventManagementDex={navProps.showEventManagementDex}
      showMyTasks={navProps.showMyTasks}
      showPushReminders={navProps.showPushReminders}
      showChecklistNotes={navProps.showChecklistNotes}
    />
  );

  return (
    <>
      <header className="border-b border-border-classic bg-background">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between gap-4">
              {accountBlock}
              {titleEl}
            </div>
            {navEl}
          </div>

          <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-x-4 sm:gap-y-2">
            <div className="justify-self-start">{accountBlock}</div>

            <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {titleEl}
              {navEl}
            </div>

            <div dir="ltr" aria-label="House No. Seven" className="flex items-baseline gap-1.5 justify-self-end text-foreground">
              <span className="text-2xl font-black uppercase tracking-tight">House</span>
              <span className="font-serif text-lg italic text-foreground/80">No.</span>
              <span className="text-2xl font-black uppercase tracking-tight">Seven</span>
            </div>
          </div>
        </div>
      </header>
      {staff && (
        <EventSwitcher events={switcherEvents} managers={switcherManagers} defaultManagerId={switcherDefaultManagerId} />
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-border-classic bg-background px-4 py-4 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} רועי פוריאן. כל הזכויות שמורות.
      </footer>
    </>
  );
}
