import { createClient } from "@/lib/supabase/server";
import { updateEventStatus } from "@/app/events/actions";
import { EVENT_STATUS_LABELS } from "@/lib/labels";
import type { EventStatus } from "@/lib/types";

const STATUSES = Object.keys(EVENT_STATUS_LABELS) as EventStatus[];

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { count: openTasks }, { count: guestCount }] = await Promise.all([
    supabase.from("events").select("notes, status").eq("id", id).single(),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .neq("status", "done"),
    supabase.from("guests").select("*", { count: "exact", head: true }).eq("event_id", id),
  ]);

  async function changeStatus(formData: FormData) {
    "use server";
    await updateEventStatus(id, formData.get("status") as EventStatus);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">משימות פתוחות</p>
          <p className="text-2xl font-bold">{openTasks ?? 0}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">אורחים</p>
          <p className="text-2xl font-bold">{guestCount ?? 0}</p>
        </div>
      </div>

      <form action={changeStatus} className="flex items-center gap-2">
        <label className="text-sm font-medium">סטטוס האירוע:</label>
        <select
          name="status"
          defaultValue={event?.status}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          עדכן
        </button>
      </form>

      {event?.notes && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-1 text-sm font-medium text-neutral-500">הערות</p>
          <p className="whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}
    </div>
  );
}
