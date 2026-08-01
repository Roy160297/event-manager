import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/labels";
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

export default async function ChecklistNotesPage() {
  const currentStaff = await getCurrentStaff();
  const readableSections = CHECKLIST_SECTIONS.filter(
    (section) => !!currentStaff && canRead(currentStaff.permissions, section.key),
  );

  if (readableSections.length === 0) return <NoPermissionNotice />;

  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("role_checklist_notes")
    .select("checklist_key, note, events!inner(id, name, event_type, event_date, deleted_at)")
    .not("note", "is", null)
    .neq("note", "")
    .is("events.deleted_at", null)
    .order("event_date", { referencedTable: "events", ascending: false })
    .returns<NoteWithEvent[]>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold">הערות וסיכומים</h1>
      <p className="text-sm text-foreground/80">
        כל ההערות שנרשמו בצ&apos;קליסטים, מרוכזות לפי סוג צ&apos;קליסט.
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
    </div>
  );
}
