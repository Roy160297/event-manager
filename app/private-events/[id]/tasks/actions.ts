"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority } from "@/lib/types";

export async function createPrivateTask(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assigneeName = String(formData.get("assignee_name") ?? "").trim() || null;
  let dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;

  if (!title) throw new Error("כותרת היא שדה חובה");

  if (!dueDate) {
    const { data: event } = await supabase.from("private_events").select("event_date").eq("id", eventId).single();
    dueDate = event?.event_date ?? null;
  }

  const { error } = await supabase
    .from("private_event_tasks")
    .insert({ event_id: eventId, title, description, assignee_name: assigneeName, due_date: dueDate, priority });

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/tasks`);
}

export async function updatePrivateTaskStatus(eventId: string, taskId: string, status: "open" | "done") {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/tasks`);
}

export async function updatePrivateTask(eventId: string, taskId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assigneeName = String(formData.get("assignee_name") ?? "").trim() || null;
  let dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;

  if (!title) throw new Error("כותרת היא שדה חובה");

  if (!dueDate) {
    const { data: event } = await supabase.from("private_events").select("event_date").eq("id", eventId).single();
    dueDate = event?.event_date ?? null;
  }

  const { error } = await supabase
    .from("private_event_tasks")
    .update({ title, description, assignee_name: assigneeName, due_date: dueDate, priority })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/tasks`);
}

export async function deletePrivateTask(eventId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("private_event_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/private-events/${eventId}/tasks`);
}
