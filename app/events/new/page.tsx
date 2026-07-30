"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { createEvent } from "@/app/events/actions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventType } from "@/lib/types";
import { DateField } from "@/components/DateField";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export default function NewEventPage() {
  // createEvent redirects on success (a thrown Next.js control-flow signal,
  // not a real error) and throws a real Error on failure (e.g. duplicate
  // date) - unstable_rethrow lets the former pass through to actually
  // navigate, while the latter is caught here and shown instead of falling
  // through to the generic redacted-message error page.
  const [error, formAction] = useActionState<string | null, FormData>(async (_prevError, formData) => {
    try {
      await createEvent(formData);
      return null;
    } catch (err) {
      unstable_rethrow(err);
      return err instanceof Error ? err.message : "שגיאה ביצירת האירוע";
    }
  }, null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">אירוע חדש</h1>
      <form
        action={formAction}
        onReset={(e) => e.preventDefault()}
        className="flex max-w-md flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">שם הלקוח / הזוג</span>
          <input
            name="name"
            required
            className="rounded-md border border-border-classic bg-surface px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">סוג האירוע</span>
          <select
            name="event_type"
            defaultValue="wedding"
            className="rounded-md border border-border-classic bg-surface px-3 py-2"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">תאריך</span>
          <DateField name="event_date" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          צור אירוע
        </button>
      </form>
    </div>
  );
}
