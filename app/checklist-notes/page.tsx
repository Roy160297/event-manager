import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { addDaysToDate, todayInIsrael } from "@/lib/coupleMeetingReminders";
import type { EventType, PermissionResource } from "@/lib/types";

const CHECKLIST_SECTIONS: { key: PermissionResource; label: string }[] = [
  { key: "closing_checklist", label: "צ'קליסט סגירה - מנהל אירוע" },
  { key: "floor_manager_checklist", label: "צ'קליסט סגירה - מנהל פלור" },
  { key: "bar_checklist", label: "צ'קליסט סגירה - בר" },
  { key: "barista_checklist", label: "צ'קליסט סגירה - בריסטה" },
];

type NoteWithEvent = {
  checklist_key: string;
  note: string | null;
  events: { id: string; name: string; event_type: EventType; event_date: string; deleted_at: string | null } | null;
};

type SummaryReportEvent = {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  report_summary: string | null;
  report_general_notes: string | null;
};

export default async function ChecklistNotesPage() {
  const currentStaff = await getCurrentStaff();
  const readableSections = CHECKLIST_SECTIONS.filter(
    (section) => !!currentStaff && canRead(currentStaff.permissions, section.key),
  );
  const canReadSummaryReport = !!currentStaff && canRead(currentStaff.permissions, "event_summary_report");

  if (readableSections.length === 0 && !canReadSummaryReport) return <NoPermissionNotice />;

  // Only recently-happened events, not the full archive - closing-checklist
  // notes and summary reports are only useful to review shortly after an
  // event, so a growing all-time list would just get harder to scan.
  const today = todayInIsrael();
  const sevenDaysAgo = addDaysToDate(today, -7);

  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("role_checklist_notes")
    .select("checklist_key, note, events!inner(id, name, event_type, event_date, deleted_at)")
    .not("note", "is", null)
    .neq("note", "")
    .is("events.deleted_at", null)
    .gte("events.event_date", sevenDaysAgo)
    .lte("events.event_date", today)
    .order("event_date", { referencedTable: "events", ascending: false })
    .returns<NoteWithEvent[]>();

  // The summary report's "summary"/"general notes" live directly on the
  // events table (not role_checklist_notes, which the 4 role checklists
  // above share), so it needs its own query and its own section shape -
  // one event can carry both a summary and general notes at once.
  const { data: summaryReportEventsRaw } = canReadSummaryReport
    ? await supabase
        .from("events")
        .select("id, name, event_type, event_date, report_summary, report_general_notes")
        .is("deleted_at", null)
        .gte("event_date", sevenDaysAgo)
        .lte("event_date", today)
        .order("event_date", { ascending: false })
        .returns<SummaryReportEvent[]>()
    : { data: null };
  const summaryReportEvents = (summaryReportEventsRaw ?? []).filter(
    (event) => event.report_summary || event.report_general_notes,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">הערות וסיכומים</h1>
      <p className="text-sm text-foreground/80">
        הערות מהצ&apos;קליסטים מאירועים ב-7 הימים האחרונים, מרוכזות לפי סוג צ&apos;קליסט.
      </p>

      {readableSections.map((section) => {
        const sectionNotes = (notes ?? []).filter(
          (row) => row.checklist_key === section.key && row.events,
        );

        return (
          <div
            key={section.key}
            className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
          >
            <p className="font-serif text-lg font-bold">{section.label}</p>

            {sectionNotes.length === 0 ? (
              <p className="text-sm text-foreground/60">אין הערות עדיין.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {sectionNotes.map((row) => (
                  <li
                    key={`${section.key}-${row.events!.id}`}
                    className="border-t border-border-classic pt-3 first:border-0 first:pt-0"
                  >
                    <p className="text-sm font-medium">
                      <Link href={`/events/${row.events!.id}/tasks`} className="text-accent hover:underline">
                        {row.events!.name}
                      </Link>
                      <span className="text-foreground/60">
                        {" "}
                        · {EVENT_TYPE_LABELS[row.events!.event_type]} · {formatDate(row.events!.event_date)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{row.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {canReadSummaryReport && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
          <p className="font-serif text-lg font-bold">דוח סיכום אירוע</p>

          {summaryReportEvents.length === 0 ? (
            <p className="text-sm text-foreground/60">אין הערות עדיין.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {summaryReportEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-1.5 border-t border-border-classic pt-3 first:border-0 first:pt-0"
                >
                  <p className="text-sm font-medium">
                    <Link href={`/events/${event.id}/tasks`} className="text-accent hover:underline">
                      {event.name}
                    </Link>
                    <span className="text-foreground/60">
                      {" "}
                      · {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
                    </span>
                  </p>
                  {event.report_summary && (
                    <p className="text-sm">
                      <span className="font-medium">סיכום האירוע: </span>
                      <span className="whitespace-pre-wrap">{event.report_summary}</span>
                    </p>
                  )}
                  {event.report_general_notes && (
                    <p className="text-sm">
                      <span className="font-medium">הערות כלליות: </span>
                      <span className="whitespace-pre-wrap">{event.report_general_notes}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
