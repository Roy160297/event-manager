"use client";

import { useEffect, useState } from "react";

const expandButtonClass = "rounded-full border border-border-classic px-3 py-1 text-xs hover:bg-accent-soft";

function useEscape(active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);
}

// A long free-text block (the event's "additional info") shown large, with a
// button that opens it in a pop-up window for comfortable reading.
export function ExpandableText({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <button type="button" className={expandButtonClass} onClick={() => setOpen(true)}>
          הגדל
        </button>
      </div>
      <p className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-accent-soft/50 p-3 text-base leading-relaxed">{text}</p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-lg border border-border-classic bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-bold">{title}</h2>
              <button type="button" className={expandButtonClass} onClick={() => setOpen(false)}>
                סגור
              </button>
            </div>
            <p className="overflow-y-auto whitespace-pre-wrap text-lg leading-relaxed">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// The same field while editing: one textarea (so the form still submits it),
// larger by default, that the button lifts into a pop-up-sized editor.
export function ExpandableTextarea({ name, defaultValue, title, className }: { name: string; defaultValue: string; title: string; className: string }) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));

  return (
    <div
      className={open ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" : "flex flex-col gap-1"}
      onClick={open ? () => setOpen(false) : undefined}
      role={open ? "presentation" : undefined}
    >
      <div
        className={open ? "flex h-[85vh] w-full max-w-3xl flex-col gap-3 rounded-lg border border-border-classic bg-surface p-5 shadow-lg" : "contents"}
        onClick={open ? (e) => e.stopPropagation() : undefined}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? title : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={open ? "font-serif text-xl font-bold" : "font-medium"}>{title}</span>
          <button type="button" className={expandButtonClass} onClick={() => setOpen(!open)}>
            {open ? "סגור" : "הגדל"}
          </button>
        </div>
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={open ? undefined : 12}
          className={open ? `${className} min-h-0 flex-1 resize-none text-lg leading-relaxed` : `${className} text-base`}
        />
      </div>
    </div>
  );
}
