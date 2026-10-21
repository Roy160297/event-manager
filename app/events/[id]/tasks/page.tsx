import { createClient } from "@/lib/supabase/server";
import { getEventTypeLabels } from "@/lib/eventTypesServer";
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
import { CLOSING_CHECKLIST_KEY, appliesToEventType, getChecklists } from "@/lib/checklists";
import { EventSummaryReportExport } from "./EventSummaryReportExport";
import { SendChecklistsEmailButton, type ChecklistForEmail } from "./SendChecklistsEmailButton";
import { ChecklistSignBlock } from "@/components/ChecklistSignBlock";
import { ChecklistPhotos } from "@/components/ChecklistPhotos";
import { signChecklist, unsignChecklist } from "./actions";
import {
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
  formatTime,
} from "@/lib/labels";
import type { ChecklistPhotoRow, ChecklistSignatureRow, EventRow, StaffRow, TaskRow, TaskStatus } from "@/lib/types";
import { DateField } from "@/components/DateField";
import { getVenueSettings } from "@/lib/venueSettings";
import {
  REPORT_END_TIME_KEY,
  displayValue,
  loadReportFields,
  longFields,
  reportInputName,
  shortFields,
  type ReportField,
} from "@/lib/reportFields";
import { TimeField } from "@/components/TimeField";

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[];

type TaskWithAssignee = TaskRow & { staff: Pick<StaffRow, "name"> | null };

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const eventTypeLabels = await getEventTypeLabels();
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
    venue,
    checklists,
    reportFields,
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
    getVenueSettings(),
    getChecklists(),
    loadReportFields(supabase),
  ]);

  function signatureFor(checklistKey: string) {
    return checklistSignatures?.find((row) => row.checklist_key === checklistKey) ?? null;
  }

  // slot omitted -> every photo for this checklist regardless of slot (used
  // for the PDF export); slot passed (including null) -> only that slot, so
  // the summary report's counter/additional-guests photos and its general
  // gallery (slot null) stay visually separate on the page.
  function photosFor(checklistKey: string, slot?: string | null) {
    return (checklistPhotos ?? [])
      .filter((row) => row.checklist_key === checklistKey && (slot === undefined || (row.slot ?? null) === slot))
      .map((row) => ({
        id: row.id,
        storagePath: row.storage_path,
        url: supabase.storage.from("checklist-photos").getPublicUrl(row.storage_path).data.publicUrl,
      }));
  }

  const canEditChecklist = !!currentStaff && canWrite(currentStaff.permissions, "closing_checklist");
  const canReadSummary = !!currentStaff && canRead(currentStaff.permissions, "event_summary_report");
  const canWriteSummary = !!currentStaff && canWrite(currentStaff.permissions, "event_summary_report");
  const canReadTasks = !!currentStaff && canRead(currentStaff.permissions, "tasks");
  const canWriteTasks = !!currentStaff && canWrite(currentStaff.permissions, "tasks");

  // Every checklist that applies to this event's type, in the order the venue
  // set (business-event first, then the event manager's, and so on).
  const checklistEntries = checklists
    .filter((definition) => appliesToEventType(definition, event?.event_type ?? null))
    .map((definition) => ({
      definition,
      canRead: !!currentStaff && canRead(currentStaff.permissions, definition.key),
      canWrite: !!currentStaff && canWrite(currentStaff.permissions, definition.key),
      initialCheckedKeys:
        definition.key === CLOSING_CHECKLIST_KEY
          ? (closingChecklistChecks?.map((row) => row.item_key) ?? [])
          : (roleChecklistChecks?.filter((row) => row.checklist_key === definition.key).map((row) => row.item_key) ?? []),
      initialNote: roleChecklistNotes?.find((row) => row.checklist_key === definition.key)?.note ?? null,
    }));
  const canReadAnyChecklist = checklistEntries.some((entry) => entry.canRead);
  const closingChecklistNote =
    roleChecklistNotes?.find((row) => row.checklist_key === CLOSING_CHECKLIST_KEY)?.note ?? null;

  if (!canReadSummary && !canReadTasks && !canReadAnyChecklist) return <NoPermissionNotice />;

  const floorManagerName = staff?.find((member) => member.id === event?.floor_manager_id)?.name ?? null;

  const reportValues = event?.report_values ?? {};
  const hasEndTimeField = reportFields.some((field) => field.key === REPORT_END_TIME_KEY);
  // Read-only list of the short fields (long texts are shown separately below).
  const summaryFields: [ReportField, string | null][] = shortFields(reportFields).map((field) => [
    field,
    displayValue(field, reportValues, floorManagerName),
  ]);

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

  const closingChecklistSignature = signatureFor(CLOSING_CHECKLIST_KEY);
  const summaryReportSignature = signatureFor("event_summary_report");

  // The checklists the venue marked "send by email" (by default only the event
  // manager's own) accompany the summary report. The others are reviewed and
  // signed in the app but never attached.
  const emailEntries = checklistEntries.filter((entry) => entry.definition.includeInEmail);
  const checklistsForEmail: ChecklistForEmail[] = emailEntries.map(({ definition, initialCheckedKeys, initialNote }) => {
    const signature = signatureFor(definition.key);
    return {
      key: definition.key,
      title: definition.label,
      categories: definition.categories,
      checkedKeys: initialCheckedKeys,
      note: initialNote,
      noteLabel: definition.noteLabel ?? undefined,
      showCategoryLabels: definition.showCategoryLabels,
      signedByName: signature?.signed_by_name ?? null,
      signatureData: signature?.signature_data ?? null,
    };
  });

  // Every emailed checklist and the event summary report need to be signed - no
  // specific field on either is mandatory, just the sign-off itself.
  const sendBlockedReasons: string[] = [];
  for (const { definition } of emailEntries) {
    if (signatureFor(definition.key)) continue;
    sendBlockedReasons.push(
      definition.key === CLOSING_CHECKLIST_KEY
        ? "יש לחתום על הצ'קליסט של מנהל האירוע"
        : `יש לחתום על הצ'קליסט: ${definition.label}`,
    );
  }
  if (!summaryReportSignature) sendBlockedReasons.push("יש לחתום על דוח סיכום אירוע");
  const canSendChecklistEmail = sendBlockedReasons.length === 0;

  const inputClass = "rounded-md border border-border-classic bg-surface px-2.5 py-1.5 text-sm";
  const reportLabelClass = "flex flex-col gap-1 text-sm";

  function renderRoleChecklist({
    definition,
    canRead: canReadThis,
    canWrite: canWriteThis,
    initialCheckedKeys,
    initialNote,
  }: (typeof checklistEntries)[number]) {
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
        noteLabel={definition.noteLabel ?? undefined}
        showCategoryLabels={definition.showCategoryLabels}
        requiresManagerCosign={definition.requiresManagerCosign}
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
  }

  return (
    <div className="flex flex-col gap-6">
      {canEditChecklist && event && (
        <SendChecklistsEmailButton
          event={event}
          reportFields={reportFields}
          managerName={managerName}
          floorManagerName={floorManagerName}
          managerEmail={managerEmail}
          guestCommitment={guestCommitment}
          checklists={checklistsForEmail}
          canSend={canSendChecklistEmail}
          blockedReasons={sendBlockedReasons}
          summaryReportSignedByName={summaryReportSignature?.signed_by_name ?? null}
          summaryReportSignatureData={summaryReportSignature?.signature_data ?? null}
          summaryReportPhotoUrls={photosFor("event_summary_report").map((photo) => photo.url)}
          defaultTo={venue.checklist_email_to}
          defaultCc={venue.checklist_email_cc}
        />
      )}

      {checklistEntries.map((entry) => {
        if (entry.definition.key !== CLOSING_CHECKLIST_KEY) return renderRoleChecklist(entry);
        if (!entry.canRead) return null;
        return (
          <ClosingChecklist
            key={entry.definition.key}
            title={entry.definition.label}
            categories={entry.definition.categories}
            noteLabel={entry.definition.noteLabel ?? undefined}
            showCategoryLabels={entry.definition.showCategoryLabels}
            eventId={eventId}
            eventName={event?.name ?? ""}
            eventType={event?.event_type ?? null}
            eventDate={event?.event_date ?? null}
            managerName={managerName}
            canEdit={entry.canWrite}
            initialCheckedKeys={entry.initialCheckedKeys}
            initialNote={closingChecklistNote}
            isSigned={!!closingChecklistSignature}
            signedByName={closingChecklistSignature?.signed_by_name}
            signedAt={closingChecklistSignature?.signed_at}
            signatureData={closingChecklistSignature?.signature_data}
            currentStaffName={currentStaff?.name}
            photos={photosFor(CLOSING_CHECKLIST_KEY)}
          />
        );
      })}

      {canReadSummary && (
      <details className="rounded-lg border border-border-classic bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          דוח סיכום אירוע
          {summaryReportSignature && <span className="text-green-700"> · נחתם</span>}
        </summary>

        <div className="mt-4 flex flex-col gap-4">
          {summaryReportSignature && (
            <p className="text-sm text-foreground/60">הדוח נחתם ונעול לעריכה.</p>
          )}
          <EventSummaryReportExport
            event={event ?? null}
            reportFields={reportFields}
            managerName={managerName}
            floorManagerName={floorManagerName}
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
              {event ? eventTypeLabels[event.event_type] : "—"}
            </p>
            <p>
              <span className="text-foreground/60">שעת תחילת האירוע: </span>
              {formatTime(event?.start_time ?? null)}
            </p>
            {hasEndTimeField && (
              <p>
                <span className="text-foreground/60">שעת סיום האירוע: </span>
                {formatTime(reportValues[REPORT_END_TIME_KEY] ?? null)}
              </p>
            )}
            <p>
              <span className="text-foreground/60">מינימום אורחים בהתחייבות: </span>
              {guestCommitment ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">מספר ילדים (התחייבות): </span>
              {event?.kids_meal_count ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">מנהל אירוע: </span>
              {managerName ?? "—"}
            </p>
          </div>

          {(!canWriteSummary || !!summaryReportSignature) && (
            <>
              <div className="grid gap-x-4 gap-y-1 rounded-md bg-accent-soft/50 p-3 text-sm sm:grid-cols-3">
                {summaryFields.map(([field, value]) => (
                  <p key={field.key}>
                    <span className="text-foreground/60">{field.label}: </span>
                    {(field.type === "time" ? formatTime(value) : value) ?? "—"}
                  </p>
                ))}
              </div>
              {summaryFields
                .filter(([field]) => field.photoSlot)
                .map(([field]) => (
                  <ChecklistPhotos
                    key={field.key}
                    eventId={eventId}
                    checklistKey="event_summary_report"
                    slot={field.photoSlot}
                    label={`תמונה - ${field.label}`}
                    compact
                    photos={photosFor("event_summary_report", field.photoSlot)}
                    canEdit={canWriteSummary && !summaryReportSignature}
                  />
                ))}
              {longFields(reportFields).map((field) => {
                const value = displayValue(field, reportValues, floorManagerName);
                return (
                  value && (
                    <div key={field.key} className="flex flex-col gap-1 text-sm">
                      <p className="font-medium">{field.label}</p>
                      <p className="whitespace-pre-wrap text-foreground/80">{value}</p>
                    </div>
                  )
                );
              })}
            </>
          )}

          {canWriteSummary && !summaryReportSignature && (
          <SaveDetailsForm action={saveSummaryReport} message="הדוח נשמר בהצלחה" className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {shortFields(reportFields)
                .filter((field) => field.type !== "floor_manager")
                .map((field) => {
                  const name = reportInputName(field.key);
                  const defaultValue = reportValues[field.key] ?? field.defaultValue ?? "";
                  const input =
                    field.type === "time" ? (
                      <TimeField name={name} defaultValue={defaultValue} />
                    ) : (
                      <input
                        name={name}
                        type={field.type === "number" ? "number" : "text"}
                        defaultValue={defaultValue}
                        className={inputClass}
                      />
                    );
                  return (
                    <div key={field.key} className="flex flex-col gap-2">
                      <label className={reportLabelClass}>
                        <span>{field.label}</span>
                        {input}
                      </label>
                      {field.photoSlot && (
                        <ChecklistPhotos
                          eventId={eventId}
                          checklistKey="event_summary_report"
                          slot={field.photoSlot}
                          label={`תמונה - ${field.label}`}
                          compact
                          photos={photosFor("event_summary_report", field.photoSlot)}
                          canEdit={canWriteSummary && !summaryReportSignature}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {longFields(reportFields).map((field) => (
              <label key={field.key} className={reportLabelClass}>
                <span>{field.label}</span>
                <textarea
                  name={reportInputName(field.key)}
                  rows={3}
                  defaultValue={reportValues[field.key] ?? field.defaultValue ?? ""}
                  className={inputClass}
                />
              </label>
            ))}

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
            slot={null}
            photos={photosFor("event_summary_report", null)}
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
      <SaveDetailsForm
        action={addTask}
        message="המשימה נוספה בהצלחה"
        clearOnSuccess
        className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-3"
      >
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
                  {task.description && (
                    <p className={`text-sm ${task.status === "done" ? "text-green-700" : "text-foreground/70"}`}>
                      {task.description}
                    </p>
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
