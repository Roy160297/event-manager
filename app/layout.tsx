import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { isPrivateEventsOwner } from "@/lib/privateEvents";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
import { getEventManagerCandidates } from "@/lib/staff";
import type { EventRow } from "@/lib/types";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "ניהול אירועים",
  description: "מערכת פנימית לניהול אירועים",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await getCurrentStaff();

  // Fetched here (rather than only within the per-event layout) so the
  // switcher sidebar shows on every page, not just an event's own sub-pages.
  // Always the full upcoming list - the switcher itself filters client-side
  // (see EventSwitcher's manager dropdown) so a user can switch away from
  // the default without a round trip.
  let switcherEvents: Pick<EventRow, "id" | "name" | "event_date" | "event_type" | "manager_id">[] = [];
  let switcherManagers: { id: string; name: string }[] = [];
  if (staff) {
    const supabase = await createClient();
    const [{ data }, managers] = await Promise.all([
      supabase
        .from("events")
        .select("id, name, event_date, event_type, manager_id")
        .is("deleted_at", null)
        .gte("event_date", todayInIsrael())
        .order("event_date", { ascending: true })
        .returns<Pick<EventRow, "id" | "name" | "event_date" | "event_type" | "manager_id">[]>(),
      getEventManagerCandidates(),
    ]);
    switcherEvents = data ?? [];
    switcherManagers = managers.map((manager) => ({ id: manager.id, name: manager.name }));
  }

  // Default the switcher to "only my events" for anyone who can actually be
  // assigned as an event's manager (same eligibility as the manager_id
  // dropdown itself - see getEventManagerCandidates) - not just the
  // "מנהל אירועים" role, since a system admin can also personally manage
  // events. Same condition as the main events page's own default (app/page.tsx).
  const isSelfAManager = staff ? switcherManagers.some((manager) => manager.id === staff.id) : false;
  const switcherDefaultManagerId = isSelfAManager ? (staff?.id ?? null) : null;

  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <AppShell
          staff={staff ? { name: staff.name } : null}
          isPrivateEventsOwner={isPrivateEventsOwner(staff)}
          navProps={{
            showAdmin: !!staff && canRead(staff.permissions, "admin"),
            showCalendar: !!staff && canRead(staff.permissions, "calendar"),
            showCoupleMeeting: !!staff && canRead(staff.permissions, "couple_meeting"),
            showEventManagementDex: !!staff && canRead(staff.permissions, "event_management_dex"),
            showMyTasks: !!staff && canRead(staff.permissions, "my_tasks"),
            showPushReminders: !!staff && canRead(staff.permissions, "push_reminder_rules"),
            showChecklistNotes:
              !!staff &&
              (canRead(staff.permissions, "closing_checklist") ||
                canRead(staff.permissions, "floor_manager_checklist") ||
                canRead(staff.permissions, "bar_checklist") ||
                canRead(staff.permissions, "barista_checklist")),
          }}
          switcherEvents={switcherEvents}
          switcherManagers={switcherManagers}
          switcherDefaultManagerId={switcherDefaultManagerId}
          signOutAction={signOut}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
