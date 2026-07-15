import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import { MainNav } from "@/components/MainNav";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <header className="border-b border-border-classic bg-background">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <span className="font-serif text-lg font-bold text-accent">ניהול אירועים</span>
              <MainNav />
            </div>

            <div dir="ltr" aria-label="House No. Seven" className="flex items-baseline gap-1.5 text-foreground">
              <span className="text-xl font-black uppercase tracking-tight">House</span>
              <span className="font-serif text-base italic text-foreground/80">No.</span>
              <span className="text-xl font-black uppercase tracking-tight">Seven</span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
