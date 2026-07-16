import { createEvent } from "@/app/events/actions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">אירוע חדש</h1>
      <form action={createEvent} className="flex max-w-md flex-col gap-4">
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
          <input
            type="date"
            name="event_date"
            required
            className="rounded-md border border-border-classic bg-surface px-3 py-2"
          />
        </label>

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
