"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditableRecipientList({
  label,
  emails,
  onChange,
}: {
  label: string;
  emails: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setError("כתובת מייל לא תקינה");
      return;
    }
    if (emails.includes(value)) {
      setError("הכתובת כבר ברשימה");
      return;
    }
    onChange([...emails, value]);
    setDraft("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground/60">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {emails.map((email) => (
          <li key={email} className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs">
            {email}
            <button
              type="button"
              onClick={() => onChange(emails.filter((e) => e !== email))}
              className="text-foreground/50 hover:text-red-600"
              aria-label={`הסר ${email}`}
            >
              ✕
            </button>
          </li>
        ))}
        {emails.length === 0 && <li className="text-xs text-foreground/50">אין נמענים</li>}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="כתובת מייל להוספה"
          className="rounded-md border border-border-classic bg-surface px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-full border border-accent px-2 py-1 text-xs text-accent hover:bg-accent-soft"
        >
          הוסף
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
