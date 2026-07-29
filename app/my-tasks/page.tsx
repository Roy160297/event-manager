import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { updateTaskStatus } from "@/app/events/[id]/tasks/actions";
import {
  EVENT_TYPE_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  formatDate,
} from "@/lib/labels";
import type { EventType, TaskRow } from "@/lib/types";

type TaskWithEvent = TaskRow & {
  events: { name: string; event_type: EventType; event_date: string } | null;
};

export default async function MyTasksPage() {
  const currentStaff = await getCurrentStaff();
  const canReadMyTasks = !!currentStaff && canRead(currentStaff.permissions, "my_tasks");

  if (!canReadMyTasks) return <NoPermissionNotice />;

  const supabase = await createClient();
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, events!inner(name, event_type, event_date, deleted_at)")
    .eq("assignee_id", currentStaff.id)
    .eq("status", "open")
    .is("events.deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<TaskWithEvent[]>();

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">המשימות שלי</h1>
      <p className="text-sm text-foreground/60">כל המשימות הפתוחות שהוקצו לך, מכל האירועים.</p>

      {error && (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת המשימות: {error.message}</p>
      )}

      {!error && (!tasks || tasks.length === 0) && (
        <p className="text-foreground/60">אין לך משימות פתוחות כרגע.</p>
      )}

      <ul className="flex flex-col gap-3">
        {tasks?.map((task) => {
          const isOverdue = !!task.due_date && task.due_date < todayStr;

          async function markDone() {
            "use server";
            await updateTaskStatus(task.event_id, task.id, "done");
          }

          return (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="text-sm text-foreground/70">{task.description}</p>}
                <p className="mt-1 text-sm text-foreground/60">
                  <Link href={`/events/${task.event_id}`} className="text-accent hover:underline">
                    {task.events?.name ?? "אירוע"}
                  </Link>
                  {task.events && ` · ${EVENT_TYPE_LABELS[task.events.event_type]} · ${formatDate(task.events.event_date)}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}>
                    עדיפות {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                  <span className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-foreground/60"}`}>
                    יעד: {formatDate(task.due_date)}
                    {isOverdue && " (באיחור)"}
                  </span>
                </div>
              </div>

              <form action={markDone}>
                <button
                  type="submit"
                  className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
                >
                  סמן כהושלם
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
