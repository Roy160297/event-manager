import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import { MainNav } from "@/components/MainNav";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { signOut } from "@/app/login/actions";
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
                  showCoupleMeeting={canRead(staff.permissions, "couple_meeting")}
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
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border-classic bg-background px-4 py-4 text-center text-xs text-foreground/50">
          © {new Date().getFullYear()} רועי פוריאן. כל הזכויות שמורות.
        </footer>
      </body>
    </html>
  );
}
