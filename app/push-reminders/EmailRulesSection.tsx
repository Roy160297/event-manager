import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { actionErrorMessage } from "@/lib/actionError";
import { createEmailReminderRule, deleteEmailReminderRule, updateEmailReminderRule } from "./emailActions";
import { TestEmailRuleButton } from "./TestEmailRuleButton";
import { CONDITION_LABELS, EmailRuleFields } from "./EmailRuleFields";
import { EmailRuleCreator } from "./EmailRuleCreator";
import type { EmailReminderRuleRow } from "@/lib/types";

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
      </div>

      {canWriteRules && <EmailRuleCreator inputClass={inputClass} labelClass={labelClass} createAction={addRule} />}

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
                    <EmailRuleFields
                      values={{
                        ...rule,
                        fallback_mode:
                          rule.anchor === "couple_meeting_date"
                            ? rule.fallback_offset_days === null
                              ? "skip"
                              : "event"
                            : null,
                        run_window: rule.run_window ?? "any",
                      }}
                      inputClass={inputClass}
                      labelClass={labelClass}
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
    </section>
  );
}
