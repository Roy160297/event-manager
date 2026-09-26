import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { actionErrorMessage } from "@/lib/actionError";
import { PushReminderRecipientFields } from "@/components/PushReminderRecipientFields";
import { createPushReminderRule, updatePushReminderRule, deletePushReminderRule } from "./actions";
import type { PushReminderRuleRow } from "@/lib/types";

const RECIPIENT_SUMMARY_LABELS: Record<PushReminderRuleRow["recipient_type"], string> = {
  event_manager: "מנהל האירוע",
  floor_manager: "מנהל הפלור של האירוע",
  role: "תפקיד",
  fixed_staff: "איש צוות",
};

export default async function PushRemindersPage() {
  const supabase = await createClient();
  const [currentStaff, { data: rules }, { data: roles }, { data: staff }] = await Promise.all([
    getCurrentStaff(),
    supabase
      .from("push_reminder_rules")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PushReminderRuleRow[]>(),
    supabase.from("roles").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
    supabase.from("staff").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
  ]);

  const canReadRules = !!currentStaff && canRead(currentStaff.permissions, "push_reminder_rules");
  const canWriteRules = !!currentStaff && canWrite(currentStaff.permissions, "push_reminder_rules");

  if (!canReadRules) return <NoPermissionNotice />;

  const roleList = roles ?? [];
  const staffList = staff ?? [];
  const roleNameById = new Map(roleList.map((role) => [role.id, role.name]));
  const staffNameById = new Map(staffList.map((member) => [member.id, member.name]));

  function recipientSummary(rule: PushReminderRuleRow): string {
    if (rule.recipient_type === "role") {
      return `תפקיד: ${(rule.recipient_role_id && roleNameById.get(rule.recipient_role_id)) ?? "לא נבחר"}`;
    }
    if (rule.recipient_type === "fixed_staff") {
      return `איש צוות: ${(rule.recipient_staff_id && staffNameById.get(rule.recipient_staff_id)) ?? "לא נבחר"}`;
    }
    return RECIPIENT_SUMMARY_LABELS[rule.recipient_type];
  }

  const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2";
  const labelClass = "flex flex-col gap-1 text-sm";

  async function addRule(formData: FormData) {
    "use server";
    try {
      await createPushReminderRule(formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">התראות פוש</h1>
        <p className="text-sm text-foreground/60">
          כל שורה מגדירה תזכורת שנשלחת כפוש בטלפון, מספר דקות לפני/אחרי שלב מסוים בלוח הזמנים של האירוע (למשל
          &quot;20 דקות לפני חופה&quot;), לנמען שבוחרים - מנהל האירוע, מנהל הפלור, כל מי שבתפקיד מסוים, או איש צוות
          קבוע. ניתן להשתמש ב-<code>{"{event_name}"}</code> בתוכן ההתראה כדי שיוחלף בשם האירוע בפועל.
        </p>
      </div>

      {canWriteRules && (
        <SaveDetailsForm
          action={addRule}
          message="ההתראה נוצרה בהצלחה"
          clearOnSuccess
          className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
        >
          <p className="text-sm font-medium">התראה חדשה</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span>שם פנימי</span>
              <input name="title" placeholder="למשל: העלאת צ'ילר לחופה" required autoFocus className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>שם השלב בלוח הזמנים לעגינה</span>
              <input name="anchor_label" placeholder="חופה" required className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>הפרש דקות (שלילי = לפני השלב, חיובי = אחריו)</span>
              <input name="offset_minutes" type="number" placeholder="-20" required className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>כותרת ההתראה</span>
              <input name="notification_title" placeholder="תזכורת: ..." required className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              <span>תוכן ההתראה</span>
              <textarea name="notification_body" required rows={2} className={inputClass} />
            </label>
            <PushReminderRecipientFields roles={roleList} staff={staffList} inputClass={inputClass} labelClass={labelClass} />
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            הוסף התראה
          </button>
        </SaveDetailsForm>
      )}

      {(!rules || rules.length === 0) && <p className="text-foreground/60">עדיין לא הוגדרו התראות.</p>}

      <ul className="flex flex-col gap-2">
        {rules?.map((rule) => {
          async function saveEdit(formData: FormData) {
            "use server";
            try {
              await updatePushReminderRule(rule.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }
          async function remove() {
            "use server";
            await deletePushReminderRule(rule.id);
          }

          return (
            <li key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {rule.title}
                    {!rule.active && <span className="ms-2 text-xs text-foreground/50">(מושבתת)</span>}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {rule.offset_minutes} דקות {rule.offset_minutes < 0 ? "לפני" : "אחרי"} שלב &quot;{rule.anchor_label}
                    &quot; · נשלח אל: {recipientSummary(rule)}
                  </p>
                </div>
                {canWriteRules && (
                  <form action={remove}>
                    <ConfirmSubmitButton
                      message="למחוק את ההתראה?"
                      title="מחק התראה"
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">מחק</span>
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>

              {canWriteRules && (
                <details className="border-t border-border-classic pt-2">
                  <summary className="cursor-pointer text-xs font-medium text-accent">ערוך</summary>
                  <SaveDetailsForm action={saveEdit} closeDetailsOnSave className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className={labelClass}>
                      <span>שם פנימי</span>
                      <input name="title" defaultValue={rule.title} required className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      <span>שם השלב בלוח הזמנים</span>
                      <input name="anchor_label" defaultValue={rule.anchor_label} required className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      <span>הפרש דקות</span>
                      <input
                        name="offset_minutes"
                        type="number"
                        defaultValue={rule.offset_minutes}
                        required
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      <span>כותרת ההתראה</span>
                      <input name="notification_title" defaultValue={rule.notification_title} required className={inputClass} />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                      <span>תוכן ההתראה</span>
                      <textarea
                        name="notification_body"
                        defaultValue={rule.notification_body}
                        required
                        rows={2}
                        className={inputClass}
                      />
                    </label>
                    <PushReminderRecipientFields
                      roles={roleList}
                      staff={staffList}
                      inputClass={inputClass}
                      labelClass={labelClass}
                      defaultType={rule.recipient_type}
                      defaultRoleId={rule.recipient_role_id}
                      defaultStaffId={rule.recipient_staff_id}
                    />
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" name="active" defaultChecked={rule.active} />
                      <span>פעילה</span>
                    </label>
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
    </div>
  );
}
