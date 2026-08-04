import { createClient } from "@/lib/supabase/server";
import { actionErrorMessage } from "@/lib/actionError";
import { TrashIcon } from "@/components/icons";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "./actions";
import { updateEventSummaryReport } from "@/app/events/actions";
import ClosingChecklist from "./ClosingChecklist";
import RoleChecklist from "./RoleChecklist";
import { ROLE_CHECKLISTS } from "@/lib/roleChecklists";
import { CLOSING_CHECKLIST } from "@/lib/closingChecklist";
import { EventSummaryReportExport } from "./EventSummaryReportExport";
import { SendChecklistsEmailButton, type ChecklistForEmail } from "./SendChecklistsEmailButton";
import { ChecklistSignBlock } from "@/components/ChecklistSignBlock";
import { ChecklistPhotos } from "@/components/ChecklistPhotos";
import { signChecklist, unsignChecklist } from "./actions";
import {
  EVENT_TYPE_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
  formatTime,
} from "@/lib/labels";
import type { ChecklistPhotoRow, ChecklistSignatureRow, EventRow, StaffRow, TaskRow, TaskStatus } from "@/lib/types";
import { DateField } from "@/components/DateField";
import { TimeField } from "@/components/TimeField";

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[];

type TaskWithAssignee = TaskRow & { staff: Pick<StaffRow, "name"> | null };

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [
    { data: tasks },
    { data: staff },
    { data: event },
    { data: closingChecklistChecks },
    { data: roleChecklistChecks },
    { data: roleChecklistNotes },
    { data: checklistSignatures },
    { data: checklistPhotos },
    currentStaff,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, staff(name)")
      .eq("event_id", eventId)
      // Open tasks above done ones ("open" > "done" alphabetically, so
      // descending puts open first), due date breaks ties within each group.
      .order("status", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<TaskWithAssignee[]>(),
    supabase
      .from("staff")
      .select("id, name, email")
      .order("name")
      .returns<Pick<StaffRow, "id" | "name" | "email">[]>(),
    supabase.from("events").select("*").eq("id", eventId).returns<EventRow[]>().single(),
    supabase.from("closing_checklist_checks").select("item_key").eq("event_id", eventId).returns<{ item_key: string }[]>(),
    supabase
      .from("role_checklist_checks")
      .select("checklist_key, item_key")
      .eq("event_id", eventId)
      .returns<{ checklist_key: string; item_key: string }[]>(),
    supabase
      .from("role_checklist_notes")
      .select("checklist_key, note")
      .eq("event_id", eventId)
      .returns<{ checklist_key: string; note: string | null }[]>(),
    supabase
      .from("checklist_signatures")
      .select("*")
      .eq("event_id", eventId)
      .returns<ChecklistSignatureRow[]>(),
    supabase
      .from("checklist_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<ChecklistPhotoRow[]>(),
    getCurrentStaff(),
  ]);

  function signatureFor(checklistKey: string) {
    return checklistSignatures?.find((row) => row.checklist_key === checklistKey) ?? null;
  }

  function photosFor(checklistKey: string) {
    return (checklistPhotos ?? [])
      .filter((row) => row.checklist_key === checklistKey)
      .map((row) => ({
        id: row.id,
        storagePath: row.storage_path,
        url: supabase.storage.from("checklist-photos").getPublicUrl(row.storage_path).data.publicUrl,
      }));
  }

  const canReadChecklist = !!currentStaff && canRead(currentStaff.permissions, "closing_checklist");
  const canEditChecklist = !!currentStaff && canWrite(currentStaff.permissions, "closing_checklist");
  const canReadSummary = !!currentStaff && canRead(currentStaff.permissions, "event_summary_report");
  const canWriteSummary = !!currentStaff && canWrite(currentStaff.permissions, "event_summary_report");
  const canReadTasks = !!currentStaff && canRead(currentStaff.permissions, "tasks");
  const canWriteTasks = !!currentStaff && canWrite(currentStaff.permissions, "tasks");

  const roleChecklistPermissions = ROLE_CHECKLISTS.map((definition) => ({
    definition,
    canRead: !!currentStaff && canRead(currentStaff.permissions, definition.key),
    canWrite: !!currentStaff && canWrite(currentStaff.permissions, definition.key),
    initialCheckedKeys:
      roleChecklistChecks?.filter((row) => row.checklist_key === definition.key).map((row) => row.item_key) ?? [],
    initialNote: roleChecklistNotes?.find((row) => row.checklist_key === definition.key)?.note ?? null,
  }));
  const canReadAnyRoleChecklist = roleChecklistPermissions.some((entry) => entry.canRead);
  const closingChecklistNote =
    roleChecklistNotes?.find((row) => row.checklist_key === "closing_checklist")?.note ?? null;

  if (!canReadChecklist && !canReadSummary && !canReadTasks && !canReadAnyRoleChecklist) return <NoPermissionNotice />;

  const summaryFields: [string, string | number | null][] = [
    ["חברת הפקה", event?.production_company ?? null],
    ["שעת סיום האירוע", event?.report_end_time ?? null],
    ["שעת יציאה מהאולם", event?.exit_time ?? null],
    ["כמות אורחים סופית - קאונטר", event?.final_guest_count_counter ?? null],
    ["כמות אורחים סופית - אייפלן", event?.final_guest_count_iplan ?? null],
    ["כמות רזרבה שנפתחו", event?.reserve_opened_count ?? null],
    ["מנהל בר", event?.bar_manager_name ?? null],
    ["כמות ברמנים", event?.bartender_count ?? null],
    ["מנהל פלור", event?.floor_manager_name ?? null],
    ["כמות מלצרים", event?.waiter_count ?? null],
    ["כמות טבחים", event?.cook_count ?? null],
    ["כמות מנקי מטבח", event?.kitchen_dishwasher_count ?? null],
    ["כמות שוטפי כלים", event?.dishwasher_count ?? null],
    ["כמות מאבטחים", event?.security_guard_count ?? null],
    ["שעות מנקה אולם", event?.hall_cleaner_hours ?? null],
    ["שעות מנקה שירותים", event?.restroom_cleaner_hours ?? null],
    ["שעות מנקי מטבח", event?.kitchen_dishwasher_hours ?? null],
    ["שעות שוטפי כלים", event?.dishwasher_hours ?? null],
    ["שעות מאבטחים", event?.security_guard_hours ?? null],
  ];

  async function addTask(formData: FormData) {
    "use server";
    try {
      await createTask(eventId, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  async function saveSummaryReport(formData: FormData) {
    "use server";
    try {
      await updateEventSummaryReport(eventId, formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  async function signSummaryReport(name: string, signature: string) {
    "use server";
    await signChecklist(eventId, "event_summary_report", name, signature);
  }

  async function unsignSummaryReport() {
    "use server";
    await unsignChecklist(eventId, "event_summary_report");
  }

  const manager = staff?.find((member) => member.id === event?.manager_id) ?? null;
  const managerName = manager?.name ?? null;
  const managerEmail = manager?.email ?? null;
  // Same field as "מספר אורחים - התחייבות" on the overview (סקירה) tab -
  // guests_adults/guests_children are separate PDF-import-only fields that
  // are usually empty for manually-created events, which was silently
  // leaving this blank on the summary report.
  const guestCommitment = event?.estimated_guests ?? null;

  const closingChecklistSignature = signatureFor("closing_checklist");
  const summaryReportSignature = signatureFor("event_summary_report");

  const checklistsForEmail: ChecklistForEmail[] = [
    {
      key: "closing_checklist",
      title: "צ'קליסט סגירה - מנהל אירוע",
      categories: CLOSING_CHECKLIST,
      checkedKeys: closingChecklistChecks?.map((row) => row.item_key) ?? [],
      note: closingChecklistNote,
      noteLabel: "הערות",
      showCategoryLabels: true,
      signedByName: closingChecklistSignature?.signed_by_name ?? null,
      signatureData: closingChecklistSignature?.signature_data ?? null,
    },
    ...ROLE_CHECKLISTS.map((definition) => {
      const signature = signatureFor(definition.key);
      return {
        key: definition.key,
        title: definition.label,
        categories: definition.categories,
        checkedKeys:
          roleChecklistChecks?.filter((row) => row.checklist_key === definition.key).map((row) => row.item_key) ?? [],
        note: roleChecklistNotes?.find((row) => row.checklist_key === definition.key)?.note ?? null,
        noteLabel: definition.noteLabel,
        signedByName: signature?.signed_by_name ?? null,
        signatureData: signature?.signature_data ?? null,
        managerCosignedByName: signature?.manager_signed_by_name ?? null,
        managerCosignatureData: signature?.manager_signature_data ?? null,
      };
    }),
  ];

  // The event manager's own checklist and the event summary report both need
  // to be signed - no specific field on either is mandatory, just the sign-
  // off itself. He can still send with whichever role checklists are ready
  // (even just one or two signed), no need to wait on everyone else.
  const sendBlockedReasons: string[] = [];
  if (!closingChecklistSignature) sendBlockedReasons.push("יש לחתום על הצ'קליסט של מנהל האירוע");
  if (!summaryReportSignature) sendBlockedReasons.push("יש לחתום על דוח סיכום אירוע");
  const canSendChecklistEmail = sendBlockedReasons.length === 0;

  const inputClass = "rounded-md border border-border-classic bg-surface px-2.5 py-1.5 text-sm";
  const reportLabelClass = "flex flex-col gap-1 text-sm";

  return (
    <div className="flex flex-col gap-6">
      {canEditChecklist && event && (
        <SendChecklistsEmailButton
          event={event}
          managerName={managerName}
          managerEmail={managerEmail}
          guestCommitment={guestCommitment}
          checklists={checklistsForEmail}
          canSend={canSendChecklistEmail}
          blockedReasons={sendBlockedReasons}
          summaryReportSignedByName={summaryReportSignature?.signed_by_name ?? null}
          summaryReportSignatureData={summaryReportSignature?.signature_data ?? null}
        />
      )}

      {canReadChecklist && (
        <ClosingChecklist
          eventId={eventId}
          eventName={event?.name ?? ""}
          eventType={event?.event_type ?? null}
          eventDate={event?.event_date ?? null}
          managerName={managerName}
          canEdit={canEditChecklist}
          initialCheckedKeys={closingChecklistChecks?.map((row) => row.item_key) ?? []}
          initialNote={closingChecklistNote}
          isSigned={!!closingChecklistSignature}
          signedByName={closingChecklistSignature?.signed_by_name}
          signedAt={closingChecklistSignature?.signed_at}
          signatureData={closingChecklistSignature?.signature_data}
          currentStaffName={currentStaff?.name}
          photos={photosFor("closing_checklist")}
        />
      )}

      {roleChecklistPermissions.map(
        ({ definition, canRead: canReadThis, canWrite: canWriteThis, initialCheckedKeys, initialNote }) => {
          if (!canReadThis) return null;
          const signature = signatureFor(definition.key);
          return (
            <RoleChecklist
              key={definition.key}
              checklistKey={definition.key}
              title={definition.label}
              categories={definition.categories}
              eventId={eventId}
              eventName={event?.name ?? ""}
              eventType={event?.event_type ?? null}
              eventDate={event?.event_date ?? null}
              canEdit={canWriteThis}
              initialCheckedKeys={initialCheckedKeys}
              noteLabel={definition.noteLabel}
              initialNote={initialNote}
              isSigned={!!signature}
              signedByName={signature?.signed_by_name}
              signedAt={signature?.signed_at}
              signatureData={signature?.signature_data}
              currentStaffName={currentStaff?.name}
              managerName={managerName}
              canManagerCosign={canEditChecklist}
              managerSignedByName={signature?.manager_signed_by_name}
              managerSignedAt={signature?.manager_signed_at}
              managerSignatureData={signature?.manager_signature_data}
              photos={photosFor(definition.key)}
            />
          );
        },
      )}

      {canReadSummary && (
      <details className="rounded-lg border border-border-classic bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          דוח סיכום אירוע - מנהל אירוע
          {summaryReportSignature && <span className="text-green-700"> · נחתם</span>}
        </summary>

        <div className="mt-4 flex flex-col gap-4">
          {summaryReportSignature && (
            <p className="text-sm text-foreground/60">הדוח נחתם ונעול לעריכה.</p>
          )}
          <EventSummaryReportExport
            event={event ?? null}
            managerName={managerName}
            guestCommitment={guestCommitment}
            signedByName={summaryReportSignature?.signed_by_name}
            signatureData={summaryReportSignature?.signature_data}
            photoUrls={photosFor("event_summary_report").map((photo) => photo.url)}
          />

          <div className="grid gap-x-4 gap-y-1 rounded-md bg-accent-soft p-3 text-sm sm:grid-cols-3">
            <p>
              <span className="text-foreground/60">תאריך: </span>
              {formatDate(event?.event_date ?? null)}
            </p>
            <p>
              <span className="text-foreground/60">שם הלקוח: </span>
              {event?.name ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">סוג אירוע: </span>
              {event ? EVENT_TYPE_LABELS[event.event_type] : "—"}
            </p>
            <p>
              <span className="text-foreground/60">שעת תחילת האירוע: </span>
              {formatTime(event?.start_time ?? null)}
            </p>
            <p>
              <span className="text-foreground/60">שעת סיום האירוע: </span>
              {formatTime(event?.report_end_time ?? null)}
            </p>
            <p>
              <span className="text-foreground/60">מינימום אורחים בהתחייבות: </span>
              {guestCommitment ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">מנהל אירוע: </span>
              {managerName ?? "—"}
            </p>
          </div>

          {(!canWriteSummary || !!summaryReportSignature) && (
            <>
              <div className="grid gap-x-4 gap-y-1 rounded-md bg-accent-soft/50 p-3 text-sm sm:grid-cols-3">
                {summaryFields.map(([label, value]) => (
                  <p key={label}>
                    <span className="text-foreground/60">{label}: </span>
                    {value ?? "—"}
                  </p>
                ))}
              </div>
              {event?.report_summary && (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">סיכום האירוע</p>
                  <p className="whitespace-pre-wrap text-foreground/80">{event.report_summary}</p>
                </div>
              )}
              {event?.report_general_notes && (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">הערות כלליות</p>
                  <p className="whitespace-pre-wrap text-foreground/80">{event.report_general_notes}</p>
                </div>
              )}
            </>
          )}

          {canWriteSummary && !summaryReportSignature && (
          <SaveDetailsForm action={saveSummaryReport} message="הדוח נשמר בהצלחה" className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={reportLabelClass}>
                <span>חברת הפקה</span>
                <input name="production_company" defaultValue={event?.production_company ?? ""} className={inputClass} />
              </label>
              <label className={reportLabelClass}>
                <span>שעת סיום האירוע</span>
                <TimeField name="report_end_time" defaultValue={event?.report_end_time ?? ""} />
              </label>
              <label className={reportLabelClass}>
                <span>שעת יציאה מהאולם</span>
                <TimeField name="exit_time" defaultValue={event?.exit_time ?? ""} />
              </label>
              <label className={reportLabelClass}>
                <span>כמות אורחים סופית - קאונטר</span>
                <input
                  type="number"
                  min={0}
                  name="final_guest_count_counter"
                  defaultValue={event?.final_guest_count_counter ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות אורחים סופית - אייפלן</span>
                <input
                  name="final_guest_count_iplan"
                  defaultValue={event?.final_guest_count_iplan ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות רזרבה שנפתחו</span>
                <input
                  type="number"
                  min={0}
                  name="reserve_opened_count"
                  defaultValue={event?.reserve_opened_count ?? ""}
                  className={inputClass}
                />
              </label>
              <div />
              <label className={reportLabelClass}>
                <span>מנהל בר</span>
                <input name="bar_manager_name" defaultValue={event?.bar_manager_name ?? "דניאל"} className={inputClass} />
              </label>
              <label className={reportLabelClass}>
                <span>כמות ברמנים</span>
                <input name="bartender_count" defaultValue={event?.bartender_count ?? ""} className={inputClass} />
              </label>
              <label className={reportLabelClass}>
                <span>מנהל פלור</span>
                <input name="floor_manager_name" defaultValue={event?.floor_manager_name ?? "אווה"} className={inputClass} />
              </label>
              <label className={reportLabelClass}>
                <span>כמות מלצרים</span>
                <input
                  type="number"
                  min={0}
                  name="waiter_count"
                  defaultValue={event?.waiter_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות טבחים</span>
                <input
                  type="number"
                  min={0}
                  name="cook_count"
                  defaultValue={event?.cook_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות מנקי מטבח</span>
                <input
                  type="number"
                  min={0}
                  name="kitchen_dishwasher_count"
                  defaultValue={event?.kitchen_dishwasher_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות שוטפי כלים</span>
                <input
                  type="number"
                  min={0}
                  name="dishwasher_count"
                  defaultValue={event?.dishwasher_count ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>כמות מאבטחים</span>
                <input
                  type="number"
                  min={0}
                  name="security_guard_count"
                  defaultValue={event?.security_guard_count ?? 2}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>שעות מנקה אולם</span>
                <input
                  name="hall_cleaner_hours"
                  placeholder="לדוגמה: 16-2:20"
                  defaultValue={event?.hall_cleaner_hours ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>שעות מנקה שירותים</span>
                <input
                  name="restroom_cleaner_hours"
                  placeholder="לדוגמה: 16:20-2:30"
                  defaultValue={event?.restroom_cleaner_hours ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>שעות מנקי מטבח</span>
                <input
                  name="kitchen_dishwasher_hours"
                  placeholder="לדוגמה: 15-3"
                  defaultValue={event?.kitchen_dishwasher_hours ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>שעות שוטפי כלים</span>
                <input
                  name="dishwasher_hours"
                  placeholder="לדוגמה: 18-3:15"
                  defaultValue={event?.dishwasher_hours ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={reportLabelClass}>
                <span>שעות מאבטחים</span>
                <input
                  name="security_guard_hours"
                  placeholder="לדוגמה: 18-3"
                  defaultValue={event?.security_guard_hours ?? ""}
                  className={inputClass}
                />
              </label>
            </div>

            <label className={reportLabelClass}>
              <span>סיכום האירוע</span>
              <textarea
                name="report_summary"
                rows={2}
                defaultValue={event?.report_summary ?? ""}
                className={inputClass}
              />
            </label>

            <label className={reportLabelClass}>
              <span>הערות כלליות</span>
              <textarea
                name="report_general_notes"
                rows={3}
                defaultValue={event?.report_general_notes ?? ""}
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              שמור דוח
            </button>
          </SaveDetailsForm>
          )}

          <ChecklistPhotos
            eventId={eventId}
            checklistKey="event_summary_report"
            photos={photosFor("event_summary_report")}
            canEdit={canWriteSummary && !summaryReportSignature}
          />

          <div className="border-t border-border-classic pt-3">
            <ChecklistSignBlock
              isSigned={!!summaryReportSignature}
              signedByName={summaryReportSignature?.signed_by_name}
              signedAt={summaryReportSignature?.signed_at}
              signatureData={summaryReportSignature?.signature_data}
              canEdit={canWriteSummary}
              defaultSignerName={managerName ?? currentStaff?.name}
              onSign={signSummaryReport}
              onUnsign={unsignSummaryReport}
            />
          </div>
        </div>
      </details>
      )}

      {canWriteTasks && (
      <SaveDetailsForm action={addTask} message="המשימה נוספה בהצלחה" className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-3">
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
      </SaveDetailsForm>
      )}

      {canReadTasks && (!tasks || tasks.length === 0) && (
        <p className="text-foreground/60">אין עדיין משימות לאירוע זה.</p>
      )}

      {canReadTasks && (
      <ul className="flex flex-col gap-2">
        {tasks?.map((task) => {
          async function changeStatus(formData: FormData) {
            "use server";
            try {
              await updateTaskStatus(eventId, task.id, formData.get("status") as TaskStatus);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }
          async function saveEdit(formData: FormData) {
            "use server";
            try {
              await updateTask(eventId, task.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
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
                  {task.status === "done" && task.description && (
                    <p className="text-sm italic text-green-700">{task.description}</p>
                  )}
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
                  {canWriteTasks && (
                    <SaveDetailsForm action={changeStatus} message="הסטטוס עודכן בהצלחה" closeDetailsOnSave className="flex items-center gap-1">
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
                  )}
                  {canWriteTasks && (
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
                  )}
                </div>
              </div>

              {canWriteTasks && (
              <details className="border-t border-border-classic pt-2">
                <summary className="cursor-pointer text-xs font-medium text-accent">ערוך משימה</summary>
                <SaveDetailsForm action={saveEdit} closeDetailsOnSave className="mt-2 grid gap-2 sm:grid-cols-2">
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
              )}
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
