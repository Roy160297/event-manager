"use client";

import { useState, type ReactNode } from "react";

// The waiters list below can get long, and finding one to edit meant
// scrolling through all of them - this filters by name client-side, keeping
// each waiter's own <li> (built server-side, with its real edit/delete
// server actions intact) and just hiding the ones that don't match.
export function WaitersSearchList({ items }: { items: { id: string; name: string; node: ReactNode }[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const filtered = trimmed ? items.filter((item) => item.name.includes(trimmed)) : items;

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש מלצר לפי שם..."
        className="rounded-md border border-border-classic bg-surface px-3 py-2 text-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-foreground/60">לא נמצאו מלצרים תואמים לחיפוש.</p>
      ) : (
        <ul className="flex flex-col gap-2">{filtered.map((item) => item.node)}</ul>
      )}
    </div>
  );
}
