import type { SupabaseClient } from "@supabase/supabase-js";
import { scheduleSortKey } from "@/lib/labels";
import { addMinutesToTime, isFriday, timeToMinutes } from "@/lib/scheduleTime";

// Which weekday a template is chosen for when an event is created.
export type DayKind = "any" | "friday" | "not_friday";

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  any: "כל יום",
  not_friday: "כל יום חוץ משישי",
  friday: "שישי בלבד",
};

export interface ScheduleStep {
  id: string;
  label: string;
  time: string;
  notes: string | null;
}

// A default run-of-show the venue defined (see the schedule_templates tables).
export interface ScheduleTemplate {
  id: string;
  name: string;
  // Event types it is filled in for automatically; empty means by hand only.
  eventTypes: string[];
  dayKind: DayKind;
  // When set, the steps are shifted so this time lands on the event's start time.
  referenceTime: string | null;
  sortOrder: number;
  steps: ScheduleStep[];
}

interface TemplateRow {
  id: string;
  name: string;
  event_types: string[];
  day_kind: DayKind;
  reference_time: string | null;
  sort_order: number;
}
interface StepRow {
  id: string;
  template_id: string;
  label: string;
  step_time: string;
  notes: string | null;
}

// Pure assembly of the two tables, steps in clock order (an after-midnight step
// sorts after the evening ones) - kept apart from the query so it is testable.
export function assembleTemplates(templates: TemplateRow[], steps: StepRow[]): ScheduleTemplate[] {
  return [...templates]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((template) => ({
      id: template.id,
      name: template.name,
      eventTypes: template.event_types ?? [],
      dayKind: template.day_kind,
      referenceTime: template.reference_time,
      sortOrder: template.sort_order,
      steps: steps
        .filter((step) => step.template_id === template.id)
        .map((step) => ({ id: step.id, label: step.label, time: step.step_time, notes: step.notes }))
        .sort((a, b) => scheduleSortKey(a.time) - scheduleSortKey(b.time)),
    }));
}

export async function loadScheduleTemplates(supabase: SupabaseClient): Promise<ScheduleTemplate[]> {
  const [templates, steps] = await Promise.all([
    supabase.from("schedule_templates").select("id, name, event_types, day_kind, reference_time, sort_order"),
    supabase.from("schedule_template_steps").select("id, template_id, label, step_time, notes"),
  ]);
  const error = templates.error ?? steps.error;
  if (error) throw new Error(error.message);
  return assembleTemplates(templates.data as TemplateRow[], steps.data as StepRow[]);
}

// The template filled in automatically for a new event: among those listing the
// event's type, one written for this weekday wins over an "any day" one; ties
// go to the one the venue ordered first. Null when none applies.
export function pickTemplate(templates: ScheduleTemplate[], eventType: string, eventDate: string | null): ScheduleTemplate | null {
  const friday = isFriday(eventDate);
  const matching = templates.filter(
    (template) =>
      template.eventTypes.includes(eventType) &&
      (template.dayKind === "any" || (template.dayKind === "friday" ? friday : !friday)),
  );
  return matching.find((template) => template.dayKind !== "any") ?? matching[0] ?? null;
}

// The template's steps for a given event: shifted so the template's reference
// time lines up with the event's start time, when both are known.
export function stepsForEvent(template: ScheduleTemplate, eventStartTime: string | null): ScheduleStep[] {
  if (!template.referenceTime || !eventStartTime) return template.steps;
  const diff = (timeToMinutes(eventStartTime) ?? 0) - (timeToMinutes(template.referenceTime) ?? 0);
  if (diff === 0) return template.steps;
  return template.steps.map((step) => ({ ...step, time: addMinutesToTime(step.time, diff) ?? step.time }));
}
