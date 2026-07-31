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
  revalidatePath("/my-tasks");
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

export async function clearClosingChecklist(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("closing_checklist_checks").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function markAllClosingChecklist(eventId: string) {
  const supabase = await createClient();
  const rows = Array.from(ALL_CLOSING_CHECKLIST_KEYS).map((itemKey) => ({ event_id: eventId, item_key: itemKey }));
  const { error } = await supabase.from("closing_checklist_checks").upsert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function setClosingChecklistNote(eventId: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_checklist_notes")
    .upsert({ event_id: eventId, checklist_key: "closing_checklist", note: note.trim() || null });

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

export async function clearRoleChecklistItems(eventId: string, checklistKey: string) {
  if (!ROLE_CHECKLIST_KEYS[checklistKey]) throw new Error("צ'קליסט לא מוכר");

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_checklist_checks")
    .delete()
    .eq("event_id", eventId)
    .eq("checklist_key", checklistKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function markAllRoleChecklistItems(eventId: string, checklistKey: string) {
  const keys = ROLE_CHECKLIST_KEYS[checklistKey];
  if (!keys) throw new Error("צ'קליסט לא מוכר");

  const supabase = await createClient();
  const rows = Array.from(keys).map((itemKey) => ({ event_id: eventId, checklist_key: checklistKey, item_key: itemKey }));
  const { error } = await supabase.from("role_checklist_checks").upsert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function setRoleChecklistNote(eventId: string, checklistKey: string, note: string) {
  if (!ROLE_CHECKLIST_KEYS[checklistKey]) {
    throw new Error("צ'קליסט לא מוכר");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_checklist_notes")
    .upsert({ event_id: eventId, checklist_key: checklistKey, note: note.trim() || null });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function signChecklist(
  eventId: string,
  checklistKey: string,
  signedByName: string,
  signatureData: string,
) {
  const name = signedByName.trim();
  if (!name) throw new Error("יש להזין שם החותם/ת");

  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_signatures")
    .insert({ event_id: eventId, checklist_key: checklistKey, signed_by_name: name, signature_data: signatureData });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

// "Unsigning" is a delete rather than an update - lets the same checklist be
// re-signed cleanly after a mistake instead of mutating a signature someone
// already relied on (e.g. it was already emailed out).
export async function unsignChecklist(eventId: string, checklistKey: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_signatures")
    .delete()
    .eq("event_id", eventId)
    .eq("checklist_key", checklistKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

const CHECKLIST_PHOTOS_BUCKET = "checklist-photos";
const VALID_PHOTO_CHECKLIST_KEYS = new Set([
  "closing_checklist",
  "event_summary_report",
  ...Object.keys(ROLE_CHECKLIST_KEYS),
]);

export async function uploadChecklistPhoto(eventId: string, checklistKey: string, formData: FormData) {
  if (!VALID_PHOTO_CHECKLIST_KEYS.has(checklistKey)) throw new Error("צ'קליסט לא מוכר");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("יש לבחור תמונה");

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${eventId}/${checklistKey}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CHECKLIST_PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from("checklist_photos")
    .insert({ event_id: eventId, checklist_key: checklistKey, storage_path: path });
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tasks`);
}

export async function deleteChecklistPhoto(eventId: string, photoId: string, storagePath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);

  await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).remove([storagePath]);
  revalidatePath(`/events/${eventId}/tasks`);
}

// Second signature on top of the role holder's own, for the 4 role
// checklists: the event manager reviews and co-signs after the role holder
// has already filled in and signed. Requires an existing signed row (RLS
// also restricts this to closing_checklist:write, not the role's own
// permission, so a bar/kitchen/etc. staff member can't co-sign as manager).
export async function cosignChecklistAsManager(
  eventId: string,
  checklistKey: string,
  signedByName: string,
  signatureData: string,
) {
  const name = signedByName.trim();
  if (!name) throw new Error("יש להזין שם החותם/ת");

  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_signatures")
    .update({ manager_signed_by_name: name, manager_signature_data: signatureData, manager_signed_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("checklist_key", checklistKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}

export async function uncosignChecklistAsManager(eventId: string, checklistKey: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_signatures")
    .update({ manager_signed_by_name: null, manager_signature_data: null, manager_signed_at: null })
    .eq("event_id", eventId)
    .eq("checklist_key", checklistKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/tasks`);
}
