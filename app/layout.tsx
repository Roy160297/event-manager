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

  const accountBlock = staff && (
    <div className="flex items-center gap-2.5 text-sm text-foreground/70">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {staff.name.trim().charAt(0)}
      </span>
      <span className="whitespace-nowrap">{staff.name}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="whitespace-nowrap rounded-full border border-border-classic bg-surface px-3 py-1 text-xs font-medium text-foreground/70 hover:border-accent hover:text-accent"
        >
          התנתקות
        </button>
      </form>
    </div>
  );

  const titleEl = <span className="font-serif text-2xl font-bold text-accent">ניהול אירועים</span>;

  const navEl = staff && (
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
  );

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <header className="border-b border-border-classic bg-background">
          <div className="mx-auto max-w-5xl px-4 py-3">
            {/* Below sm: two stacked rows instead of the 3-column grid - a
                narrow shared column left the nav too little width to wrap
                the way it does on desktop (long labels collided instead of
                landing on their own line). Row 1 is account+title, row 2 is
                the nav spanning the page's full width so it wraps the same
                way the desktop version does. */}
            <div className="flex flex-col gap-2 sm:hidden">
              <div className="flex items-center justify-between gap-4">
                {accountBlock}
                {titleEl}
              </div>
              {navEl}
            </div>

            {/* sm+: three-column grid, not flex+justify-between - with only
                two flex children the "corners" are really just leftover
                space at each end, so they end up uneven once the nav's width
                varies. A grid with fixed-width outer columns and a flexible
                middle one keeps both corners pinned edge-to-edge and the nav
                genuinely centered between them. Grid respects the inherited
                dir="rtl", so first DOM column -> rightmost, last DOM column
                -> leftmost, same as flex would. */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-x-4 sm:gap-y-2">
              {/* Rightmost: account. */}
              <div className="justify-self-start">{accountBlock}</div>

              {/* Middle: title + nav, centered between the two corners. */}
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {titleEl}
                {navEl}
              </div>

              {/* Leftmost: logo. */}
              <div dir="ltr" aria-label="House No. Seven" className="flex items-baseline gap-1.5 justify-self-end text-foreground">
                <span className="text-2xl font-black uppercase tracking-tight">House</span>
                <span className="font-serif text-lg italic text-foreground/80">No.</span>
                <span className="text-2xl font-black uppercase tracking-tight">Seven</span>
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
