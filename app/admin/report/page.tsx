import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { REPORT_FIELD_TYPE_LABELS, loadReportFields, type ReportField, type ReportFieldType } from "@/lib/reportFields";
import { addField, deleteField, moveField, updateField } from "./actions";

const TYPES = Object.keys(REPORT_FIELD_TYPE_LABELS) as ReportFieldType[];

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const smallButton = "rounded-md border border-border-classic px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40";
const saveButton = "rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft";
const dangerButton = "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50";

function FieldEditor({ field, first, last }: { field: ReportField; first: boolean; last: boolean }) {
  async function save(formData: FormData) {
    "use server";
    return updateField(field.key, formData);
  }
  async function up() {
    "use server";
    await moveField(field.key, "up");
  }
  async function down() {
    "use server";
    await moveField(field.key, "down");
  }
  async function remove() {
    "use server";
    await deleteField(field.key);
  }

  return (
    <li className="flex flex-wrap items-start gap-2 rounded-lg border border-border-classic bg-surface p-3">
      <span className="flex shrink-0 gap-1">
        <form action={up}>
          <button type="submit" className={smallButton} disabled={first} aria-label="הזז למעלה" title="הזז למעלה">
            ↑
          </button>
        </form>
        <form action={down}>
          <button type="submit" className={smallButton} disabled={last} aria-label="הזז למטה" title="הזז למטה">
            ↓
          </button>
        </form>
      </span>

      <SaveDetailsForm action={save} message="הרובריקה נשמרה" className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input name="label" defaultValue={field.label} required aria-label="שם הרובריקה" className={`${inputClass} min-w-0 flex-1 basis-56 font-medium`} />
          <select name="field_type" defaultValue={field.type} aria-label="סוג" className={inputClass}>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {REPORT_FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <input
            name="default_value"
            defaultValue={field.defaultValue ?? ""}
            placeholder="ערך התחלתי (לא חובה)"
            aria-label="ערך התחלתי"
            className={`${inputClass} w-44`}
          />
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="with_photo" defaultChecked={!!field.photoSlot} className="h-4 w-4" />
            אפשר לצרף תמונה
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="show_in_notes" defaultChecked={field.showInNotes} className="h-4 w-4" />
            להציג בעמוד &quot;הערות וסיכומים&quot; (לטקסט ארוך)
          </label>
          <button type="submit" className={saveButton}>
            שמור
          </button>
        </div>
      </SaveDetailsForm>

      <form action={remove}>
        <ConfirmSubmitButton
          message={`להסיר את הרובריקה "${field.label}" מהדוח? הערכים שכבר נשמרו באירועים לא יוצגו יותר.`}
          className={dangerButton}
        >
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">מחק רובריקה</span>
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

export default async function ReportAdminPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const fields = await loadReportFields(await createClient());

  async function create(formData: FormData) {
    "use server";
    return addField(formData);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        הרובריקות של &quot;דוח סיכום אירוע&quot; בלשונית &quot;משימות וצ&apos;קליסטים&quot; של כל אירוע. אפשר להוסיף, לשנות שם ולסדר מחדש
        רובריקות, להגדיר ערך התחלתי, ולהסיר רובריקות שלא צריך. הרובריקות מוצגות בטופס, בהדפסה ובמייל הסיכום: שדות קצרים בטבלה
        ושדות ארוכים בתיבות רחבות מתחתיה.
      </p>
      <p className="text-xs text-foreground/60">
        פרטי האירוע שבראש הדוח (תאריך, שם הלקוח, שעת התחלה, התחייבות, מנהל אירוע) נלקחים אוטומטית מהאירוע ואי אפשר לשנות אותם כאן.
        שימו לב: הסרת רובריקה מסתירה אותה מכל הדוחות, גם מאירועים שכבר נשמרו.
      </p>

      {!canEdit && <p className="text-sm text-foreground/60">אפשר לצפות ברובריקות, אך אין לך הרשאה לערוך אותן.</p>}

      {canEdit && (
        <SaveDetailsForm
          action={create}
          message="הרובריקה נוספה"
          clearOnSuccess
          className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">רובריקה חדשה</span>
            <input name="label" required placeholder="למשל: כמות מדריכי חניה" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/70">סוג</span>
            <select name="field_type" defaultValue="text" className={inputClass}>
              {TYPES.filter((type) => type !== "floor_manager").map((type) => (
                <option key={type} value={type}>
                  {REPORT_FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={saveButton}>
            הוסף רובריקה
          </button>
        </SaveDetailsForm>
      )}

      <ul className={canEdit ? "flex flex-col gap-2" : "pointer-events-none flex flex-col gap-2 opacity-80"}>
        {fields.map((field, index) => (
          <FieldEditor key={field.key} field={field} first={index === 0} last={index === fields.length - 1} />
        ))}
        {fields.length === 0 && <li className="text-foreground/60">עדיין לא הוגדרו רובריקות.</li>}
      </ul>
    </div>
  );
}
