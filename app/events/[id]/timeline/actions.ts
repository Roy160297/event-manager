"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { scheduleSortKey } from "@/lib/labels";
import { KETUBAH_STEP_LABEL, addMinutesToTime, ketubahWitnessNote } from "@/lib/scheduleTime";
import { loadScheduleTemplates, pickTemplate, stepsForEvent } from "@/lib/scheduleTemplates";
import { extractTimelineFromImage, type TimelineImportDraft } from "@/lib/timelineImport";
import type { TimelineItemRow } from "@/lib/types";

export async function parseTimelineImage(formData: FormData): Promise<TimelineImportDraft[]> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("הקובץ שנבחר אינו תמונה");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return extractTimelineFromImage(buffer, file.type);
}

export async function addTimelineItemsFromImport(eventId: string, items: TimelineImportDraft[]) {
  const validItems = items.filter((item) => item.label.trim());
  if (validItems.length === 0) throw new Error("אין שלבים תקינים להוספה");

  const supabase = await createClient();
  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = validItems.map((item, index) => {
    const label = item.label.trim();
    const approxTime = item.approx_time?.trim() || null;
    return {
      event_id: eventId,
      label,
      approx_time: approxTime,
      notes: label === KETUBAH_STEP_LABEL && approxTime ? ketubahWitnessNote(approxTime) : item.notes?.trim() || null,
      sort_order: (count ?? 0) + index,
    };
  });

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) throw new Error(error.message);

  for (const item of validItems) {
    if (item.approx_time?.trim()) await schedulePushRemindersForStep(eventId, item.label.trim(), item.approx_time.trim());
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function addTimelineItem(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes =
    label === KETUBAH_STEP_LABEL && approxTime
      ? ketubahWitnessNote(approxTime)
      : String(formData.get("notes") ?? "").trim() || null;

  if (!label || !approxTime) throw new Error("כותרת השלב והשעה הם שדות חובה");

  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("timeline_items").insert({
    event_id: eventId,
    label,
    approx_time: approxTime,
    notes,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);

  await schedulePushRemindersForStep(eventId, label, approxTime);

  revalidatePath(`/events/${eventId}/timeline`);
}

// Shifts the chosen step and every step after it (in displayed/sorted
// order, not insertion order) by the same number of minutes - e.g. running
// 20 minutes late from "חופה" onward without having to retype every
// following step's time by hand.
export async function shiftTimelineFrom(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const fromItemId = String(formData.get("from_item_id") ?? "").trim();
  const minutesRaw = String(formData.get("minutes") ?? "").trim();
  const minutes = Number(minutesRaw);

  if (!fromItemId) throw new Error("יש לבחור שלב התחלה");
  if (!minutesRaw || !Number.isFinite(minutes) || minutes === 0) {
    throw new Error("יש להזין מספר דקות שונה מאפס");
  }

  const { data: rawItems, error: fetchError } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("event_id", eventId)
    .returns<TimelineItemRow[]>();
  if (fetchError) throw new Error(fetchError.message);

  const items = (rawItems ?? []).sort((a, b) => scheduleSortKey(a.approx_time) - scheduleSortKey(b.approx_time));
  const fromIndex = items.findIndex((item) => item.id === fromItemId);
  if (fromIndex === -1) throw new Error("השלב שנבחר לא נמצא");

  const toShift = items.slice(fromIndex).filter((item) => item.approx_time);
  const updates = toShift.map((item) => {
    const approxTime = addMinutesToTime(item.approx_time!, minutes);
    return {
      id: item.id,
      approx_time: approxTime,
      notes: item.label === KETUBAH_STEP_LABEL && approxTime ? ketubahWitnessNote(approxTime) : undefined,
    };
  });

  for (const update of updates) {
    const { error } = await supabase
      .from("timeline_items")
      .update({
        approx_time: update.approx_time,
        ...(update.notes !== undefined ? { notes: update.notes } : {}),
      })
      .eq("id", update.id);
    if (error) throw new Error(error.message);
  }

  // Any shifted step could be the anchor of some active reminder rule -
  // reschedule each one against its new time, same as editing it directly.
  for (const [index, item] of toShift.entries()) {
    const newTime = updates[index].approx_time;
    if (newTime) await schedulePushRemindersForStep(eventId, item.label, newTime);
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("timeline_items").select("label").eq("id", itemId).maybeSingle();

  const { error } = await supabase.from("timeline_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  if (item?.label) await cancelPushRemindersForEvent(eventId, item.label);

  revalidatePath(`/events/${eventId}/timeline`);
}

export async function deleteAllTimelineItems(eventId: string) {
  const supabase = await createClient();
  await cancelPushRemindersForEvent(eventId, null);
  const { error } = await supabase.from("timeline_items").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/timeline`);
}

export async function updateTimelineItem(eventId: string, itemId: string, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const approxTime = String(formData.get("approx_time") ?? "").trim() || null;
  const notes =
    label === KETUBAH_STEP_LABEL && approxTime
      ? ketubahWitnessNote(approxTime)
      : String(formData.get("notes") ?? "").trim() || null;

  if (!label || !approxTime) throw new Error("כותרת השלב והשעה הם שדות חובה");

  const { data: previous } = await supabase.from("timeline_items").select("label").eq("id", itemId).maybeSingle();

  const { error } = await supabase
    .from("timeline_items")
    .update({ label, approx_time: approxTime, notes })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  // Editing an existing step (fixing its time, or relabeling it into/out of
  // matching some rule's anchor) should reschedule/cancel the same way
  // creating the default schedule does - not just insertSchedule's own call.
  if (previous?.label && previous.label !== label) await cancelPushRemindersForEvent(eventId, previous.label);
  await schedulePushRemindersForStep(eventId, label, approxTime);

  revalidatePath(`/events/${eventId}/timeline`);
}

// `client` lets a caller with no logged-in user (the iPlan sync route, which
// authenticates with a token) pass an admin client instead of the cookie one.
async function insertSchedule(
  eventId: string,
  schedule: { label: string; time: string; notes?: string }[],
  client?: SupabaseClient,
) {
  const supabase = client ?? (await createClient());

  const { count } = await supabase
    .from("timeline_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const rows = schedule.map((step, index) => ({
    event_id: eventId,
    label: step.label,
    approx_time: step.time,
    notes: step.label === KETUBAH_STEP_LABEL ? ketubahWitnessNote(step.time) : step.notes ?? null,
    sort_order: (count ?? 0) + index,
  }));

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) throw new Error(error.message);

  for (const step of schedule) {
    await schedulePushRemindersForStep(eventId, step.label, step.time, supabase);
  }

  revalidatePath(`/events/${eventId}/timeline`);
}

// Schedules (or reschedules) every active push_reminder_rules row anchored
// to this step's label, timed relative to its time - see
// schedule_push_reminders_for_step in the 00000000000058 migration. A no-op
// if no rule is anchored to this label. Best-effort - a failure here (e.g.
// app_settings.push_webhook_secret not configured yet) shouldn't block
// editing the timeline itself.
export async function schedulePushRemindersForStep(eventId: string, label: string, time: string, client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  try {
    await supabase.rpc("schedule_push_reminders_for_step", { p_event_id: eventId, p_label: label, p_time: time });
  } catch (err) {
    console.error(`Failed to schedule push reminders for event ${eventId}, step "${label}":`, err);
  }
}

// Cancels any push reminder(s) anchored to p_label for this event (or every
// push reminder for the event, if p_label is null) - used when a step is
// deleted or the whole timeline is wiped, so a stale job doesn't fire for a
// step that no longer exists.
async function cancelPushRemindersForEvent(eventId: string, label: string | null) {
  const supabase = await createClient();
  try {
    await supabase.rpc("cancel_push_reminders_for_event", { p_event_id: eventId, p_label: label });
  } catch (err) {
    console.error(`Failed to cancel push reminders for event ${eventId}:`, err);
  }
}

async function startTimeOf(supabase: SupabaseClient, eventId: string): Promise<string | null> {
  const { data } = await supabase.from("events").select("start_time").eq("id", eventId).maybeSingle();
  return data?.start_time ?? null;
}

// Fills the event's timeline from one of the venue's schedule templates (the
// buttons on the timeline tab). Templates that name a reference time are
// shifted to the event's own start time.
export async function addScheduleFromTemplate(eventId: string, templateId: string) {
  const supabase = await createClient();
  const template = (await loadScheduleTemplates(supabase)).find((candidate) => candidate.id === templateId);
  if (!template) throw new Error("התבנית לא נמצאה");

  const steps = stepsForEvent(template, await startTimeOf(supabase, eventId));
  await insertSchedule(
    eventId,
    steps.map((step) => ({ label: step.label, time: step.time, notes: step.notes ?? undefined })),
    supabase,
  );
}

// Called right after a new event is created, so events of a type that has a
// matching template (chosen by event type and weekday, see pickTemplate) start
// with it pre-filled instead of empty. Other event types are left as before,
// filled in manually on the timeline page.
export async function applyDefaultSchedule(eventId: string, eventType: string, eventDate?: string | null, client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  const template = pickTemplate(await loadScheduleTemplates(supabase), eventType, eventDate ?? null);
  if (!template) return;

  const steps = stepsForEvent(template, await startTimeOf(supabase, eventId));
  await insertSchedule(
    eventId,
    steps.map((step) => ({ label: step.label, time: step.time, notes: step.notes ?? undefined })),
    supabase,
  );
}

// Every distinct step label across the venue's schedule templates - offered as
// autocomplete suggestions for a push reminder rule's anchor_label (see
// app/push-reminders/page.tsx), since a typo there means the rule silently
// never matches any real timeline step and just never fires.
export async function getKnownTimelineStepLabels(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("schedule_template_steps").select("label");
  return [...new Set((data ?? []).map((step) => step.label as string))].sort((a, b) => a.localeCompare(b, "he"));
}
