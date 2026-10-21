import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TimeField } from "@/components/TimeField";
import { TrashIcon } from "@/components/icons";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { DAY_KIND_LABELS, loadScheduleTemplates, type DayKind, type ScheduleTemplate } from "@/lib/scheduleTemplates";
import type { EventType } from "@/lib/types";
import {
  addStep,
  createTemplate,
  deleteStep,
  deleteTemplate,
  duplicateTemplate,
  moveTemplate,
  updateStep,
  updateTemplate,
} from "./actions";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
const DAY_KINDS = Object.keys(DAY_KIND_LABELS) as DayKind[];

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const smallButton = "rounded-md border border-border-classic px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40";
const saveButton = "rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft";
const dangerButton = "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50";

function autoApplySummary(template: ScheduleTemplate): string {
  if (template.eventTypes.length === 0) return "ידני בלבד";
  const types = template.eventTypes.map((type) => EVENT_TYPE_LABELS[type as EventType] ?? type).join(", ");
  return `${types} · ${DAY_KIND_LABELS[template.dayKind]}`;
}

function StepRow({ step }: { step: ScheduleTemplate["steps"][number] }) {
  async function save(formData: FormData) {
    "use server";
    return updateStep(step.id, formData);
  }
  async function remove() {
    "use server";
    await deleteStep(step.id);
  }

  return (
    <li className="flex flex-wrap items-start gap-2 border-b border-border-classic pb-2 last:border-0">
      <SaveDetailsForm action={save} message="השלב נשמר" className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
        <TimeField name="step_time" defaultValue={step.time} />
        <input name="label" defaultValue={step.label} required aria-label="כותרת השלב" className={`${inputClass} min-w-0 flex-1 basis-48`} />
        <input name="notes" defaultValue={step.notes ?? ""} placeholder="הערות (לא חובה)" aria-label="הערות" className={`${inputClass} min-w-0 flex-1 basis-40`} />
        <button type="submit" className={saveButton}>
          שמור
        </button>
      </SaveDetailsForm>
      <form action={remove}>
        <ConfirmSubmitButton message="למחוק את השלב מהתבנית?" className={dangerButton}>
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">מחק שלב</span>
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

function TemplateEditor({ template, index, total }: { template: ScheduleTemplate; index: number; total: number }) {
  const id = template.id;

  async function save(formData: FormData) {
    "use server";
    return updateTemplate(id, formData);
  }
  async function up() {
    "use server";
    await moveTemplate(id, "up");
  }
  async function down() {
    "use server";
    await moveTemplate(id, "down");
  }
  async function duplicate() {
    "use server";
    await duplicateTemplate(id);
  }
  async function remove() {
    "use server";
    await deleteTemplate(id);
  }
  async function newStep(formData: FormData) {
    "use server";
    return addStep(id, formData);
  }

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {template.name} <span className="text-foreground/60">({template.steps.length === 1 ? "שלב אחד" : `${template.steps.length} שלבים`} · {autoApplySummary(template)})</span>
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        <SaveDetailsForm
          action={save}
          message="ההגדרות נשמרו בהצלחה"
          className="flex flex-col gap-3 rounded-md border border-border-classic bg-background p-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">שם התבנית</span>
            <input name="name" defaultValue={template.name} required className={inputClass} />
          </label>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">להחיל אוטומטית על אירוע חדש מסוג</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {EVENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="event_types" value={type} defaultChecked={template.eventTypes.includes(type)} className="h-4 w-4" />
                  {EVENT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
            <span className="text-xs text-foreground/60">
              בלי סימון, התבנית לא מוחלת אוטומטית, ואפשר ליצור ממנה לוח זמנים בכפתור בלשונית &quot;לוח זמנים&quot; של האירוע.
            </span>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">ביום איזה בשבוע התבנית הזו נבחרת</span>
            <select name="day_kind" defaultValue={template.dayKind} className={inputClass}>
              {DAY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {DAY_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <span className="text-xs text-foreground/60">
              כשיש שתי תבניות לאותו סוג אירוע, למשל ערב וצהרי שישי, נבחרת התבנית שמתאימה ליום האירוע.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">שעת ייחוס (לא חובה)</span>
            <input name="reference_time" defaultValue={template.referenceTime ?? ""} placeholder="למשל 12:00" dir="ltr" className={`${inputClass} w-32`} />
            <span className="text-xs text-foreground/60">
              אם מוגדרת, כל שעות התבנית יוזזו כך שהשעה הזו תיפול על שעת תחילת האירוע. מתאים לתבנית שכתובה לקבלת פנים בשעה קבועה.
            </span>
          </label>

          <button type="submit" className={`${saveButton} self-start`}>
            שמירת הגדרות
          </button>
        </SaveDetailsForm>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex shrink-0 gap-1">
            <form action={up}>
              <button type="submit" className={smallButton} disabled={index === 0} aria-label="הזז למעלה" title="הזז למעלה">
                ↑
              </button>
            </form>
            <form action={down}>
              <button type="submit" className={smallButton} disabled={index === total - 1} aria-label="הזז למטה" title="הזז למטה">
                ↓
              </button>
            </form>
          </span>
          <span className="text-xs text-foreground/60">שנה מיקום הלו&quot;ז הנוכחי ברשימת הלו&quot;זים</span>
          <form action={duplicate} className="ms-auto">
            <button type="submit" className={saveButton}>
              שכפל תבנית
            </button>
          </form>
          <form action={remove}>
            <ConfirmSubmitButton message={`למחוק את התבנית "${template.name}"?`} className={dangerButton}>
              <TrashIcon className="h-4 w-4" />
              מחק תבנית
            </ConfirmSubmitButton>
          </form>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">שלבים</p>
          <ul className="flex flex-col gap-2">
            {template.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
            {template.steps.length === 0 && <li className="text-sm text-foreground/60">אין שלבים בתבנית.</li>}
          </ul>
        </div>

        <SaveDetailsForm
          action={newStep}
          message="השלב נוסף"
          clearOnSuccess
          className="flex flex-wrap items-end gap-2 border-t border-border-classic pt-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/70">שעה</span>
            <TimeField name="step_time" />
          </label>
          <label className="flex min-w-0 flex-1 basis-48 flex-col gap-1 text-sm">
            <span className="text-foreground/70">שלב חדש</span>
            <input name="label" required placeholder="למשל: קבלת פנים" className={inputClass} />
          </label>
          <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-sm">
            <span className="text-foreground/70">הערות</span>
            <input name="notes" className={inputClass} />
          </label>
          <button type="submit" className={saveButton}>
            הוסף שלב
          </button>
        </SaveDetailsForm>
      </div>
    </details>
  );
}

export default async function SchedulesAdminPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const templates = await loadScheduleTemplates(await createClient());

  async function create(formData: FormData) {
    "use server";
    return createTemplate(formData);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        תבניות לוחות הזמנים שמוצעות בלשונית &quot;לוח זמנים&quot; של כל אירוע, ושממלאות אוטומטית את לוח הזמנים של אירוע חדש לפי סוגו
        ויום השבוע. שינוי בתבנית חל על אירועים חדשים בלבד, ולא על לוחות זמנים שכבר נוצרו.
      </p>
      <p className="text-xs text-foreground/60">
        שימו לב: אם שינוי כותרת של שלב מתייחס לשלב שמוגדרת לו התראה (למשל &quot;חופה&quot;), צריך לעדכן גם את ההתראה במסך &quot;התראות ותזכורות&quot;.
        השלב &quot;כתובה&quot; מקבל אוטומטית הערה על הגעת עדים.
      </p>

      {!canEdit && <p className="text-sm text-foreground/60">אפשר לצפות בתבניות, אך אין לך הרשאה לערוך אותן.</p>}

      {canEdit && (
        <SaveDetailsForm
          action={create}
          message="התבנית נוצרה"
          clearOnSuccess
          className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">תבנית חדשה</span>
            <input name="name" required placeholder="למשל: בר מצווה ערב" className={inputClass} />
          </label>
          <button type="submit" className={saveButton}>
            צור תבנית
          </button>
        </SaveDetailsForm>
      )}

      <div className={canEdit ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-80"}>
        {templates.map((template, index) => (
          <TemplateEditor key={template.id} template={template} index={index} total={templates.length} />
        ))}
        {templates.length === 0 && <p className="text-foreground/60">עדיין לא הוגדרו תבניות.</p>}
      </div>
    </div>
  );
}
