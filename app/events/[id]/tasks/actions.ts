"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export async function createTask(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assigneeId = String(formData.get("assignee_id") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;

  if (!title) throw new Error("כותרת המשימה היא שדה חובה");

  const { error } = await supabase.from("tasks").insert({
    event_id: eventId,
    title,
    description,
    assignee_id: assigneeId,
    due_date: dueDate,
    priority,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function updateTaskStatus(eventId: string, taskId: string, status: TaskStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function deleteTask(eventId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}
