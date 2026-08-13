import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import { MainNav } from "@/components/MainNav";
import { EventSwitcher } from "@/components/EventSwitcher";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { todayInIsrael } from "@/lib/coupleMeetingReminders";
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
  let switcherEvents: Pick<EventRow, "id" | "name" | "event_date" | "event_type">[] | null = null;
  if (staff) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("id, name, event_date, event_type")
      .is("deleted_at", null)
      .gte("event_date", todayInIsrael())
      .order("event_date", { ascending: true })
      .returns<Pick<EventRow, "id" | "name" | "event_date" | "event_type">[]>();
    switcherEvents = data;
  }

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <header className="border-b border-border-classic bg-background">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="font-serif text-lg font-bold text-accent">ניהול אירועים</span>
              {staff && (
                <MainNav
                  showAdmin={canRead(staff.permissions, "admin")}
                  showCalendar={canRead(staff.permissions, "calendar")}
                  showCoupleMeeting={canRead(staff.permissions, "couple_meeting")}
                  showEventManagementDex={canRead(staff.permissions, "event_management_dex")}
                  showMyTasks={canRead(staff.permissions, "my_tasks")}
                  showChecklistNotes={
                    canRead(staff.permissions, "closing_checklist") ||
                    canRead(staff.permissions, "floor_manager_checklist") ||
                    canRead(staff.permissions, "bar_checklist") ||
                    canRead(staff.permissions, "barista_checklist")
                  }
                />
              )}
            </div>

            <div className="flex items-center gap-4">
              {staff && (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <span>{staff.name}</span>
                  <form action={signOut}>
                    <button type="submit" className="underline hover:text-foreground">
                      התנתקות
                    </button>
                  </form>
                </div>
              )}
              <div
                dir="ltr"
                aria-label="House No. Seven"
                className="hidden items-baseline gap-1.5 text-foreground sm:flex"
              >
                <span className="text-xl font-black uppercase tracking-tight">House</span>
                <span className="font-serif text-base italic text-foreground/80">No.</span>
                <span className="text-xl font-black uppercase tracking-tight">Seven</span>
              </div>
            </div>
          </div>
        </header>
        {staff && <EventSwitcher events={switcherEvents ?? []} />}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border-classic bg-background px-4 py-4 text-center text-xs text-foreground/50">
          © {new Date().getFullYear()} רועי פוריאן. כל הזכויות שמורות.
        </footer>
      </body>
    </html>
  );
}
