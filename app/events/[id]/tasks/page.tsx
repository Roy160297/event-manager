import { createClient } from "@/lib/supabase/server";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "./actions";
import ClosingChecklist from "./ClosingChecklist";
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";
import type { EventRow, StaffRow, TaskRow, TaskStatus } from "@/lib/types";
import { DateField } from "@/components/DateField";

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[];

type TaskWithAssignee = TaskRow & { staff: Pick<StaffRow, "name"> | null };

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [{ data: tasks }, { data: staff }, { data: event }, { data: closingChecklistChecks }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, staff(name)")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<TaskWithAssignee[]>(),
    supabase.from("staff").select("id, name").order("name").returns<Pick<StaffRow, "id" | "name">[]>(),
    supabase
      .from("events")
      .select("manager_id, event_date")
      .eq("id", eventId)
      .returns<Pick<EventRow, "manager_id" | "event_date">[]>()
      .single(),
    supabase.from("closing_checklist_checks").select("item_key").eq("event_id", eventId).returns<{ item_key: string }[]>(),
  ]);

  async function addTask(formData: FormData) {
    "use server";
    await createTask(eventId, formData);
  }

  const inputClass = "rounded-md border border-border-classic bg-surface px-2.5 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-6">
      <ClosingChecklist
        eventId={eventId}
        initialCheckedKeys={closingChecklistChecks?.map((row) => row.item_key) ?? []}
      />

      <form action={addTask} className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-3">
        <p className="text-sm font-medium">משימה חדשה</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="title" placeholder="כותרת" required className={`${inputClass} sm:col-span-2`} />
          <textarea
            name="description"
            placeholder="תיאור (לא חובה)"
            rows={1}
            className={`${inputClass} sm:col-span-2`}
          />
          <select name="assignee_id" defaultValue={event?.manager_id ?? ""} required className={inputClass}>
            <option value="" disabled>
              בחרו מנהל/ת אחראי/ת
            </option>
            {staff?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue="normal" className={inputClass}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                עדיפות {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <DateField name="due_date" defaultValue={event?.event_date ?? ""} />
            <span className="text-xs text-foreground/50">
              (אם לא ייבחר תאריך, ברירת המחדל היא תאריך האירוע)
            </span>
          </div>
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          הוסף משימה
        </button>
      </form>

      {(!tasks || tasks.length === 0) && (
        <p className="text-foreground/60">אין עדיין משימות לאירוע זה.</p>
      )}

      <ul className="flex flex-col gap-2">
        {tasks?.map((task) => {
          async function changeStatus(formData: FormData) {
            "use server";
            await updateTaskStatus(eventId, task.id, formData.get("status") as TaskStatus);
          }
          async function saveEdit(formData: FormData) {
            "use server";
            await updateTask(eventId, task.id, formData);
          }
          async function remove() {
            "use server";
            await deleteTask(eventId, task.id);
          }

          return (
            <li
              key={task.id}
              className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-foreground/60">
                    {task.staff?.name ? `אחראי: ${task.staff.name}` : "ללא אחראי"}
                    {" · "}
                    יעד: {formatDate(task.due_date)}
                  </p>
                  <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${TASK_PRIORITY_COLORS[task.priority]}`}>
                    עדיפות {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  <SaveDetailsForm action={changeStatus} message="הסטטוס עודכן בהצלחה" className="flex items-center gap-1">
                    <select name="status" defaultValue={task.status} className="rounded-md border border-border-classic bg-surface px-2 py-1 text-sm">
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-border-classic px-2 py-1 text-sm hover:bg-accent-soft"
                    >
                      עדכן
                    </button>
                  </SaveDetailsForm>
                  <form action={remove}>
                    <button
                      type="submit"
                      title="מחק משימה"
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">מחק</span>
                    </button>
                  </form>
                </div>
              </div>

              <details className="border-t border-border-classic pt-2">
                <summary className="cursor-pointer text-xs font-medium text-accent">ערוך משימה</summary>
                <SaveDetailsForm action={saveEdit} className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    name="title"
                    defaultValue={task.title}
                    required
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <textarea
                    name="description"
                    defaultValue={task.description ?? ""}
                    rows={1}
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <select name="assignee_id" defaultValue={task.assignee_id ?? ""} required className={inputClass}>
                    <option value="" disabled>
                      בחרו מנהל/ת אחראי/ת
                    </option>
                    {staff?.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <select name="priority" defaultValue={task.priority} className={inputClass}>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        עדיפות {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                  <div className="sm:col-span-2">
                    <DateField name="due_date" defaultValue={task.due_date ?? ""} />
                  </div>
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
