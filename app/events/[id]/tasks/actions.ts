"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ALL_CLOSING_CHECKLIST_KEYS } from "@/lib/closingChecklist";
import { ROLE_CHECKLIST_KEYS } from "@/lib/roleChecklists";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export async function createTask(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assigneeId = String(formData.get("assignee_id") ?? "").trim() || null;
  let dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;

  if (!title || !assigneeId) {
    throw new Error("כותרת ואחראי הם שדות חובה");
  }

  if (!dueDate) {
    const { data: event } = await supabase
      .from("events")
      .select("event_date")
      .eq("id", eventId)
      .single();
    dueDate = event?.event_date ?? null;
  }

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

export async function updateTask(eventId: string, taskId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assigneeId = String(formData.get("assignee_id") ?? "").trim() || null;
  let dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;

  if (!title || !assigneeId) {
    throw new Error("כותרת ואחראי הם שדות חובה");
  }

  if (!dueDate) {
    const { data: event } = await supabase
      .from("events")
      .select("event_date")
      .eq("id", eventId)
      .single();
    dueDate = event?.event_date ?? null;
  }

  const { error } = await supabase
    .from("tasks")
    .update({ title, description, assignee_id: assigneeId, due_date: dueDate, priority })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function deleteTask(eventId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function setClosingChecklistItem(eventId: string, itemKey: string, checked: boolean) {
  if (!ALL_CLOSING_CHECKLIST_KEYS.has(itemKey)) {
    throw new Error("פריט צ'קליסט לא מוכר");
  }

  const supabase = await createClient();
  const { error } = checked
    ? await supabase.from("closing_checklist_checks").upsert({ event_id: eventId, item_key: itemKey })
    : await supabase.from("closing_checklist_checks").delete().eq("event_id", eventId).eq("item_key", itemKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function setRoleChecklistItem(
  eventId: string,
  checklistKey: string,
  itemKey: string,
  checked: boolean,
) {
  if (!ROLE_CHECKLIST_KEYS[checklistKey]?.has(itemKey)) {
    throw new Error("פריט צ'קליסט לא מוכר");
  }

  const supabase = await createClient();
  const { error } = checked
    ? await supabase
        .from("role_checklist_checks")
        .upsert({ event_id: eventId, checklist_key: checklistKey, item_key: itemKey })
    : await supabase
        .from("role_checklist_checks")
        .delete()
        .eq("event_id", eventId)
        .eq("checklist_key", checklistKey)
        .eq("item_key", itemKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}
