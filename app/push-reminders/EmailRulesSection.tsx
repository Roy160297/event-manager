import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { actionErrorMessage } from "@/lib/actionError";
import { EMAIL_PLACEHOLDERS } from "@/lib/emailReminders";
import { createEmailReminderRule, deleteEmailReminderRule, updateEmailReminderRule } from "./emailActions";
import { TestEmailRuleButton } from "./TestEmailRuleButton";
import type { EmailReminderRuleRow } from "@/lib/types";

const CONDITION_LABELS: Record<EmailReminderRuleRow["condition"], string> = {
  none: "ללא תנאי",
  additional_info_filled: "רק אם מולא מידע נוסף באירוע",
  supplier_dj_tzach_ziv: "רק אם הדיג'י באירוע הוא צח זיו",
};

const ANCHOR_LABELS: Record<EmailReminderRuleRow["anchor"], string> = {
  couple_meeting_date: "פגישת הזוג",
  event_date: "תאריך האירוע",
};

function describeTiming(rule: EmailReminderRuleRow): string {
  const anchor = ANCHOR_LABELS[rule.anchor];
  const when =
    rule.offset_days === 0
      ? `ביום ${anchor}`
      : `${Math.abs(rule.offset_days)} ימים ${rule.offset_days < 0 ? "לפני" : "אחרי"} ${anchor}`;
  const fallback =
    rule.anchor === "couple_meeting_date" && rule.fallback_offset_days !== null
      ? ` (ללא תאריך פגישה: ${
          rule.fallback_offset_days === 0
            ? "ביום האירוע"
            : `${Math.abs(rule.fallback_offset_days)} ימים ${rule.fallback_offset_days < 0 ? "לפני" : "אחרי"} האירוע`
        })`
      : "";
  const once = rule.match_mode === "on_or_after" ? " · נשלח פעם אחת, גם אם המועד כבר עבר" : "";
  const window = rule.run_window === "morning" ? " · בבוקר" : rule.run_window === "evening" ? " · בערב" : "";
  return `${when}${fallback}${once}${window}`;
}

function describeRecipients(rule: EmailReminderRuleRow): string {
  const parts: string[] = [];
  if (rule.to_event_manager) parts.push("מנהל האירוע");
  if (rule.to_salesperson) parts.push("איש המכירות של האירוע");
  if (rule.extra_emails) parts.push(rule.extra_emails);
  return parts.join(", ");
}

function RuleFields({
  rule,
  inputClass,
  labelClass,
}: {
  rule?: EmailReminderRuleRow;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>שם פנימי</span>
        <input name="title" defaultValue={rule?.title} placeholder="למשל: תזכורת לעדכון סקיצה" required className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>נשלח ביחס ל...</span>
        <select name="anchor" defaultValue={rule?.anchor ?? "event_date"} className={inputClass}>
          <option value="event_date">תאריך האירוע</option>
          <option value="couple_meeting_date">תאריך פגישת הזוג</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>מספר ימים (שלילי = לפני, חיובי = אחרי, 0 = באותו יום)</span>
        <input name="offset_days" type="number" step={1} defaultValue={rule?.offset_days ?? -1} required className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>אם אין תאריך פגישה - ימים ביחס לתאריך האירוע (אופציונלי)</span>
        <input
          name="fallback_offset_days"
          type="number"
          step={1}
          defaultValue={rule?.fallback_offset_days ?? ""}
          placeholder="למשל -7"
          className={inputClass}
        />
        <span className="text-xs text-foreground/50">רלוונטי רק כשהתזכורת נשלחת ביחס לפגישת הזוג. בלי ערך - לא תישלח.</span>
      </label>
      <label className={labelClass}>
        <span>אם המועד כבר עבר</span>
        <select name="match_mode" defaultValue={rule?.match_mode ?? "exact"} className={inputClass}>
          <option value="exact">לשלוח רק בדיוק ביום המתאים</option>
          <option value="on_or_after">לשלוח פעם אחת ביום המתאים או אחריו</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>שעת שליחה</span>
        <select name="run_window" defaultValue={rule?.run_window ?? ""} className={inputClass}>
          <option value="">בכל ריצה של המערכת</option>
          <option value="morning">בבוקר</option>
          <option value="evening">בערב</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>תנאי</span>
        <select name="condition" defaultValue={rule?.condition ?? "none"} className={inputClass}>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
        <legend className="mb-1">נמענים</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="to_event_manager" defaultChecked={rule?.to_event_manager ?? true} />
          <span>מנהל האירוע</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="to_salesperson" defaultChecked={rule?.to_salesperson ?? false} />
          <span>איש המכירות של האירוע</span>
        </label>
        <label className={`${labelClass} mt-1`}>
          <span>כתובות נוספות (מופרדות בפסיק)</span>
          <input name="extra_emails" defaultValue={rule?.extra_emails ?? ""} placeholder="name@example.com, other@example.com" className={inputClass} />
        </label>
      </fieldset>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>נושא האימייל</span>
        <input name="subject" defaultValue={rule?.subject} required className={inputClass} />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>תוכן האימייל</span>
        <textarea name="body" defaultValue={rule?.body} required rows={6} className={inputClass} />
      </label>
    </>
  );
}

export function EmailRulesSection({
  rules,
  canWriteRules,
  inputClass,
  labelClass,
}: {
  rules: EmailReminderRuleRow[];
  canWriteRules: boolean;
  inputClass: string;
  labelClass: string;
}) {
  async function addRule(formData: FormData) {
    "use server";
    try {
      await createEmailReminderRule(formData);
    } catch (err) {
      return actionErrorMessage(err);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">תזכורות אוטומטיות באימייל</h2>
        <p className="text-sm text-foreground/80">
          כל שורה מגדירה אימייל שנשלח אוטומטית בתאריך שנגזר מהאירוע (למשל &quot;יום לפני האירוע&quot; או &quot;יום אחרי
          פגישת הזוג&quot;), אל הנמענים שבוחרים. האימייל נשלח פעם אחת לכל אירוע ביום המתאים.
        </p>
        <p className="text-sm text-foreground/80">
          אפשר להשתמש בנושא ובתוכן במילים הבאות, והן יוחלפו בנתוני האירוע:{" "}
          {Object.entries(EMAIL_PLACEHOLDERS).map(([key, label], index) => (
            <span key={key}>
              {index > 0 && ", "}
              <code>{`{${key}}`}</code> ({label})
            </span>
          ))}
          .
        </p>
      </div>

      {canWriteRules && (
        <SaveDetailsForm
          action={addRule}
          message="התזכורת נוצרה בהצלחה"
          clearOnSuccess
          className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4"
        >
          <p className="text-sm font-medium">תזכורת חדשה באימייל</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <RuleFields inputClass={inputClass} labelClass={labelClass} />
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            הוסף תזכורת
          </button>
        </SaveDetailsForm>
      )}

      {rules.length === 0 && <p className="text-foreground/60">עדיין לא הוגדרו תזכורות באימייל.</p>}

      <ul className="flex flex-col gap-2">
        {rules.map((rule) => {
          async function saveEdit(formData: FormData) {
            "use server";
            try {
              await updateEmailReminderRule(rule.id, formData);
            } catch (err) {
              return actionErrorMessage(err);
            }
          }
          async function remove() {
            "use server";
            await deleteEmailReminderRule(rule.id);
          }

          return (
            <li key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {rule.title}
                    {!rule.active && <span className="ms-2 text-xs text-foreground/50">(מושבתת)</span>}
                  </p>
                  <p className="text-sm text-foreground/60">{describeTiming(rule)}</p>
                  <p className="text-sm text-foreground/60">
                    נשלח אל: {describeRecipients(rule)}
                    {rule.condition !== "none" && ` · ${CONDITION_LABELS[rule.condition]}`}
                  </p>
                </div>
                {canWriteRules && (
                  <div className="flex items-start gap-2">
                    <TestEmailRuleButton ruleId={rule.id} />
                    <form action={remove}>
                      <ConfirmSubmitButton
                        message="למחוק את התזכורת?"
                        title="מחק תזכורת"
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">מחק</span>
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                )}
              </div>

              {canWriteRules && (
                <details className="border-t border-border-classic pt-2">
                  <summary className="cursor-pointer text-xs font-medium text-accent">ערוך</summary>
                  <SaveDetailsForm action={saveEdit} closeDetailsOnSave className="mt-2 grid gap-2 sm:grid-cols-2">
                    <RuleFields rule={rule} inputClass={inputClass} labelClass={labelClass} />
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
    </section>
  );
}
