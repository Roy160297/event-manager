import { createClient } from "@/lib/supabase/server";
import { createTask, deleteTask, updateTaskStatus } from "./actions";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, formatDate } from "@/lib/labels";
import type { StaffRow, TaskRow, TaskStatus } from "@/lib/types";

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[];

type TaskWithAssignee = TaskRow & { staff: Pick<StaffRow, "name"> | null };

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: tasks }, { data: staff }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, staff(name)")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<TaskWithAssignee[]>(),
    supabase.from("staff").select("id, name").order("name").returns<Pick<StaffRow, "id" | "name">[]>(),
  ]);

  async function addTask(formData: FormData) {
    "use server";
    await createTask(eventId, formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={addTask} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm font-medium">משימה חדשה</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            placeholder="כותרת"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            name="description"
            placeholder="תיאור (לא חובה)"
            rows={2}
            className="rounded-md border border-neutral-300 px-3 py-2 sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="assignee_id"
            defaultValue=""
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">ללא אחראי</option>
            {staff?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="due_date"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="priority"
            defaultValue="normal"
            className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                עדיפות {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black"
        >
          הוסף משימה
        </button>
      </form>

      {(!tasks || tasks.length === 0) && (
        <p className="text-neutral-500">אין עדיין משימות לאירוע זה.</p>
      )}

      <ul className="flex flex-col gap-2">
        {tasks?.map((task) => {
          async function changeStatus(formData: FormData) {
            "use server";
            await updateTaskStatus(eventId, task.id, formData.get("status") as TaskStatus);
          }
          async function remove() {
            "use server";
            await deleteTask(eventId, task.id);
          }

          return (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-neutral-500">
                  {task.staff?.name ? `אחראי: ${task.staff.name}` : "ללא אחראי"}
                  {" · "}
                  יעד: {formatDate(task.due_date)} · עדיפות {TASK_PRIORITY_LABELS[task.priority]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={changeStatus} className="flex items-center gap-1">
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    עדכן
                  </button>
                </form>
                <form action={remove}>
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    מחק
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
