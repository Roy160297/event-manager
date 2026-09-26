"use client";

import Link from "next/link";
import { SwitchIcon } from "@/components/icons";

// "Switch profile"-style control shown only to the private-events owner (see
// isPrivateEventsOwner) - lets them jump between the venue's whole app shell
// and their own private one without hunting for a nav link buried in either
// one's own navigation.
export function WorkspaceSwitcher({ isPrivateMode }: { isPrivateMode: boolean }) {
  return (
    <details className="relative">
      <summary
        title="החלפת סביבת עבודה"
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-border-classic bg-surface text-foreground/60 [&::-webkit-details-marker]:hidden hover:border-accent hover:text-accent"
      >
        <SwitchIcon className="h-4 w-4" />
      </summary>
      <div className="absolute end-0 top-9 z-20 flex w-max flex-col gap-1 rounded-md border border-border-classic bg-surface p-1.5 text-sm shadow-md">
        <Link
          href="/"
          className={
            "whitespace-nowrap rounded-md px-3 py-1.5 " +
            (!isPrivateMode ? "bg-accent-soft font-medium text-accent" : "text-foreground/70 hover:bg-accent-soft")
          }
        >
          האולם
        </Link>
        <Link
          href="/private-events"
          className={
            "whitespace-nowrap rounded-md px-3 py-1.5 " +
            (isPrivateMode ? "bg-accent-soft font-medium text-accent" : "text-foreground/70 hover:bg-accent-soft")
          }
        >
          האירועים הפרטיים שלי
        </Link>
      </div>
    </details>
  );
}
