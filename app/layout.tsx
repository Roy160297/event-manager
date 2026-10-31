import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { isPrivateEventsOwner } from "@/lib/privateEvents";
import { getPrivateEventsOwnerEmail } from "@/lib/privateEventsOwner";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { todaysEventDate } from "@/lib/scheduleTime";
import { getEventManagerCandidates } from "@/lib/staff";
import { getVenueSettings, venueLogoUrl } from "@/lib/venueSettings";
import { getChecklists } from "@/lib/checklists";
import { getEventTypes } from "@/lib/eventTypesServer";
import { EventTypesProvider } from "@/components/EventTypesProvider";
import type { EventRow } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניהול אירועים",
  description: "מערכת פנימית לניהול אירועים",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Everything the shell needs is asked for at once - the switcher's events
  // do not depend on the staff row (RLS decides what a session sees), so they
  // no longer wait behind it. Logged-out visitors just get nothing back.
  // The switcher is shown on every page, not just an event's own sub-pages, and
  // gets the full upcoming list: it filters client-side (see EventSwitcher's
  // manager dropdown) so a user can switch away from the default without a
  // round trip.
  const supabase = await createClient();
  const [staff, venue, checklists, eventTypes, privateOwnerEmail, { data: upcomingEvents }, managers] = await Promise.all([
    getCurrentStaff(),
    getVenueSettings(),
    getChecklists(),
    getEventTypes(),
    getPrivateEventsOwnerEmail(),
    supabase
      .from("events")
      .select("id, name, event_date, event_type, manager_id")
      .is("deleted_at", null)
      .gte("event_date", todaysEventDate())
      .order("event_date", { ascending: true })
      .returns<Pick<EventRow, "id" | "name" | "event_date" | "event_type" | "manager_id">[]>(),
    getEventManagerCandidates(),
  ]);
  const switcherEvents = staff ? (upcomingEvents ?? []) : [];
  const switcherManagers = staff ? managers.map((manager) => ({ id: manager.id, name: manager.name })) : [];

  // Default the switcher to "only my events" for anyone who can actually be
  // assigned as an event's manager (same eligibility as the manager_id
  // dropdown itself - see getEventManagerCandidates) - not just the
  // "מנהל אירועים" role, since a system admin can also personally manage
  // events. Same condition as the main events page's own default (app/page.tsx).
  const isSelfAManager = staff ? switcherManagers.some((manager) => manager.id === staff.id) : false;
  const switcherDefaultManagerId = isSelfAManager ? (staff?.id ?? null) : null;

  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <EventTypesProvider types={eventTypes}>
        <AppShell
          staff={staff ? { name: staff.name } : null}
          isPrivateEventsOwner={isPrivateEventsOwner(staff, privateOwnerEmail)}
          venueName={venue.venue_name}
          venueLogoUrl={venueLogoUrl(venue)}
          navProps={{
            showAdmin: !!staff && canRead(staff.permissions, "admin"),
            showCalendar: !!staff && canRead(staff.permissions, "calendar"),
            showCoupleMeeting: !!staff && canRead(staff.permissions, "couple_meeting"),
            showEventManagementDex: !!staff && canRead(staff.permissions, "event_management_dex"),
            showMyTasks: !!staff && canRead(staff.permissions, "my_tasks"),
            showPushReminders: !!staff && canRead(staff.permissions, "push_reminder_rules"),
            showChecklistNotes:
              !!staff && checklists.some((checklist) => canRead(staff.permissions, checklist.key)),
          }}
          switcherEvents={switcherEvents}
          switcherManagers={switcherManagers}
          switcherDefaultManagerId={switcherDefaultManagerId}
          switcherCanReadSummary={!!staff && canRead(staff.permissions, "event_summary_report")}
          signOutAction={signOut}
        >
          {children}
        </AppShell>
        </EventTypesProvider>
      </body>
    </html>
  );
}
