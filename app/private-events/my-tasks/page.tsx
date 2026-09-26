import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { DateField } from "@/components/DateField";
import { updatePrivateTask, updatePrivateTaskStatus } from "@/app/private-events/[id]/tasks/actions";
import { actionErrorMessage } from "@/lib/actionError";
import { TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS, formatDate } from "@/lib/labels";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import type { PrivateEventTaskRow, PrivateEventType, TaskPriority } from "@/lib/types";

type TaskWithEvent = PrivateEventTaskRow & {
  private_events: { name: string; event_type: PrivateEventType; event_date: string } | null;
};

const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[];
const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";

// This section has no per-staff assignment (assignee_name is free text, and
// there's only ever one real user here), so "my tasks" is simply every open
// task across all of Roy's private events - not filtered by assignee like
// the venue's own /my-tasks is.
export default async function PrivateMyTasksPage() {
  const supabase = await createClient();
  const { data: tasks, error } = await supabase
    .from("private_event_tasks")
    .select("*, private_events!inner(name, event_type, event_date)")
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<TaskWithEvent[]>();

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">המשימות שלי</h1>
      <p className="text-sm text-foreground/80">כל המשימות הפתוחות, מכל האירועים הפרטיים.</p>

      {error && <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת המשימות: {error.message}</p>}

      {!error && (!tasks || tasks.length === 0) && <p className="text-foreground/60">אין משימות פתוחות כרגע.</p>}

      <ul className="flex flex-col gap-3">
        {tasks?.map((task) => {
          const isOverdue = !!task.due_date && task.due_date < todayStr;

          async function markDone() {
            "use server";
            await updatePrivateTaskStatus(task.event_id, task.id, "done");
          }

          async function saveEdit(formData: FormData) {
            "use server";
            formData.set("assignee_name", task.assignee_name ?? "");
            try {
              await updatePrivateTask(task.event_id, task.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }

          return (
            <li key={task.id} className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{task.title}</p>
                  {task.description && <p className="text-sm text-foreground/70">{task.description}</p>}
                  <p className="mt-1 text-sm text-foreground/60">
                    <Link href={`/private-events/${task.event_id}`} className="text-accent hover:underline">
                      {task.private_events?.name ?? "אירוע"}
                    </Link>
                    {task.private_events &&
                      ` · ${PRIVATE_EVENT_TYPE_LABELS[task.private_events.event_type]} · ${formatDate(task.private_events.event_date)}`}
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
                  <button type="submit" className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft">
                    סמן כהושלם
                  </button>
                </form>
              </div>

              <details className="border-t border-border-classic pt-2">
                <summary className="cursor-pointer text-xs font-medium text-accent">ערוך משימה</summary>
                <SaveDetailsForm action={saveEdit} closeDetailsOnSave className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input name="title" defaultValue={task.title} required className={`${inputClass} sm:col-span-2`} />
                  <textarea name="description" defaultValue={task.description ?? ""} rows={1} className={`${inputClass} sm:col-span-2`} />
                  <select name="priority" defaultValue={task.priority} className={inputClass}>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        עדיפות {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                  <DateField name="due_date" defaultValue={task.due_date ?? ""} />
                  <button
                    type="submit"
                    className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft sm:col-span-2"
                  >
                    שמור שינויים
                  </button>
                </SaveDetailsForm>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
