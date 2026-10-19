import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { countItems, getChecklists, type ChecklistDefinition } from "@/lib/checklists";
import type { EventType } from "@/lib/types";
import {
  addCategory,
  addItem,
  createChecklist,
  deleteCategory,
  deleteChecklist,
  deleteItem,
  moveCategory,
  moveChecklist,
  moveItem,
  renameCategory,
  updateChecklist,
  updateItem,
} from "./actions";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const smallButton = "rounded-md border border-border-classic px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40";
const saveButton = "rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft";
const dangerButton = "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50";

// Two small up/down buttons; each is its own form so the page needs no client code.
function MoveButtons({
  onUp,
  onDown,
  first,
  last,
}: {
  onUp: () => Promise<void>;
  onDown: () => Promise<void>;
  first: boolean;
  last: boolean;
}) {
  return (
    <span className="flex shrink-0 gap-1">
      <form action={onUp}>
        <button type="submit" className={smallButton} disabled={first} aria-label="הזז למעלה" title="הזז למעלה">
          ↑
        </button>
      </form>
      <form action={onDown}>
        <button type="submit" className={smallButton} disabled={last} aria-label="הזז למטה" title="הזז למטה">
          ↓
        </button>
      </form>
    </span>
  );
}

function ChecklistEditor({ checklist, index, total }: { checklist: ChecklistDefinition; index: number; total: number }) {
  const key = checklist.key;
  const isSystem = checklist.isSystem;

  async function save(formData: FormData) {
    "use server";
    return updateChecklist(key, formData);
  }
  async function up() {
    "use server";
    await moveChecklist(key, "up");
  }
  async function down() {
    "use server";
    await moveChecklist(key, "down");
  }
  async function remove() {
    "use server";
    await deleteChecklist(key);
  }
  async function newCategory(formData: FormData) {
    "use server";
    return addCategory(key, formData);
  }

  const checkboxLabel = "flex items-start gap-2 text-sm";

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {checklist.label} <span className="text-foreground/60">({countItems(checklist.categories) === 1 ? "סעיף אחד" : `${countItems(checklist.categories)} סעיפים`})</span>
        {isSystem && <span className="text-foreground/60"> · הצ&apos;קליסט הראשי</span>}
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        <SaveDetailsForm
          action={save}
          message="ההגדרות נשמרו בהצלחה"
          className="flex flex-col gap-3 rounded-md border border-border-classic bg-background p-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">שם הצ&apos;קליסט</span>
            <input name="label" defaultValue={checklist.label} required className={inputClass} />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <label className={checkboxLabel}>
              <input type="checkbox" name="has_notes" defaultChecked={!!checklist.noteLabel} className="mt-0.5 h-4 w-4" />
              <span>תיבת הערות חופשית בסוף הצ&apos;קליסט</span>
            </label>
            <input
              name="note_label"
              defaultValue={checklist.noteLabel ?? ""}
              placeholder="כותרת התיבה, למשל: הערות"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={checkboxLabel}>
              <input type="checkbox" name="show_category_labels" defaultChecked={checklist.showCategoryLabels} className="mt-0.5 h-4 w-4" />
              <span>להציג את שמות הקטגוריות ככותרות (במסך ובהדפסה)</span>
            </label>
            <label className={checkboxLabel}>
              <input type="checkbox" name="include_in_email" defaultChecked={checklist.includeInEmail} className="mt-0.5 h-4 w-4" />
              <span>לצרף למייל הסיכום שנשלח עם דוח סיכום האירוע (ודורש חתימה לפני השליחה)</span>
            </label>
            {!isSystem && (
              <label className={checkboxLabel}>
                <input
                  type="checkbox"
                  name="requires_manager_cosign"
                  defaultChecked={checklist.requiresManagerCosign}
                  className="mt-0.5 h-4 w-4"
                />
                <span>מנהל האירוע חותם גם הוא אחרי בעל התפקיד</span>
              </label>
            )}
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">מוצג בסוגי האירוע</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {EVENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="event_types"
                    value={type}
                    defaultChecked={!!checklist.eventTypes?.includes(type)}
                    className="h-4 w-4"
                  />
                  {EVENT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
            <span className="text-xs text-foreground/60">בלי סימון, הצ&apos;קליסט מוצג בכל סוגי האירועים.</span>
          </fieldset>

          <button type="submit" className={`${saveButton} self-start`}>
            שמירת הגדרות
          </button>
        </SaveDetailsForm>

        <div className="flex flex-wrap items-center gap-2">
          <MoveButtons onUp={up} onDown={down} first={index === 0} last={index === total - 1} />
          <span className="text-xs text-foreground/60">סדר ההופעה בין הצ&apos;קליסטים</span>
          {!isSystem && (
            <form action={remove} className="ms-auto">
              <ConfirmSubmitButton
                message={`למחוק את הצ'קליסט "${checklist.label}" עם כל הסעיפים, הסימונים, החתימות והתמונות שנשמרו בו? לא ניתן לשחזר.`}
                className={dangerButton}
              >
                <TrashIcon className="h-4 w-4" />
                מחק צ&apos;קליסט
              </ConfirmSubmitButton>
            </form>
          )}
        </div>

        {checklist.categories.map((category, categoryIndex) => (
          <CategoryEditor
            key={category.key}
            checklistKey={key}
            category={category}
            first={categoryIndex === 0}
            last={categoryIndex === checklist.categories.length - 1}
          />
        ))}

        <SaveDetailsForm
          action={newCategory}
          message="הקטגוריה נוספה"
          clearOnSuccess
          className="flex flex-col gap-2 border-t border-border-classic pt-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">קטגוריה חדשה</span>
            <input name="label" required placeholder="למשל: חצר" className={inputClass} />
          </label>
          <button type="submit" className={saveButton}>
            הוסף קטגוריה
          </button>
        </SaveDetailsForm>
      </div>
    </details>
  );
}

function CategoryEditor({
  checklistKey,
  category,
  first,
  last,
}: {
  checklistKey: string;
  category: ChecklistDefinition["categories"][number];
  first: boolean;
  last: boolean;
}) {
  async function rename(formData: FormData) {
    "use server";
    return renameCategory(checklistKey, category.key, formData);
  }
  async function up() {
    "use server";
    await moveCategory(checklistKey, category.key, "up");
  }
  async function down() {
    "use server";
    await moveCategory(checklistKey, category.key, "down");
  }
  async function remove() {
    "use server";
    await deleteCategory(checklistKey, category.key);
  }
  async function newItem(formData: FormData) {
    "use server";
    return addItem(checklistKey, category.key, formData);
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border-classic p-3">
      <div className="flex flex-wrap items-center gap-2">
        <MoveButtons onUp={up} onDown={down} first={first} last={last} />
        <SaveDetailsForm action={rename} message="השם עודכן" className="flex flex-1 items-center gap-2">
          <input name="label" defaultValue={category.label} required aria-label="שם הקטגוריה" className={`${inputClass} min-w-0 flex-1 font-medium`} />
          <button type="submit" className={saveButton}>
            שמור
          </button>
        </SaveDetailsForm>
        <form action={remove}>
          <ConfirmSubmitButton
            message={`למחוק את הקטגוריה "${category.label}" ואת כל ${category.items.length} הסעיפים שבה?`}
            className={dangerButton}
          >
            <TrashIcon className="h-4 w-4" />
            מחק קטגוריה
          </ConfirmSubmitButton>
        </form>
      </div>

      <ul className="flex flex-col gap-2">
        {category.items.map((item, itemIndex) => (
          <ItemEditor
            key={item.key}
            checklistKey={checklistKey}
            item={item}
            first={itemIndex === 0}
            last={itemIndex === category.items.length - 1}
          />
        ))}
        {category.items.length === 0 && <li className="text-sm text-foreground/60">אין סעיפים בקטגוריה.</li>}
      </ul>

      <SaveDetailsForm action={newItem} message="הסעיף נוסף" clearOnSuccess className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-foreground/70">סעיף חדש</span>
          <input name="text" required className={inputClass} />
        </label>
        <button type="submit" className={saveButton}>
          הוסף סעיף
        </button>
      </SaveDetailsForm>
    </section>
  );
}

function ItemEditor({
  checklistKey,
  item,
  first,
  last,
}: {
  checklistKey: string;
  item: { key: string; text: string };
  first: boolean;
  last: boolean;
}) {
  async function save(formData: FormData) {
    "use server";
    return updateItem(checklistKey, item.key, formData);
  }
  async function up() {
    "use server";
    await moveItem(checklistKey, item.key, "up");
  }
  async function down() {
    "use server";
    await moveItem(checklistKey, item.key, "down");
  }
  async function remove() {
    "use server";
    await deleteItem(checklistKey, item.key);
  }

  return (
    <li className="flex flex-wrap items-start gap-2">
      <MoveButtons onUp={up} onDown={down} first={first} last={last} />
      <SaveDetailsForm action={save} message="הסעיף נשמר" className="flex min-w-0 flex-1 items-start gap-2">
        <textarea
          name="text"
          defaultValue={item.text}
          required
          rows={2}
          aria-label="נוסח הסעיף"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button type="submit" className={saveButton}>
          שמור
        </button>
      </SaveDetailsForm>
      <form action={remove}>
        <ConfirmSubmitButton message="למחוק את הסעיף מהצ'קליסט?" className={dangerButton}>
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">מחק סעיף</span>
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

export default async function ChecklistsAdminPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const checklists = await getChecklists();

  async function create(formData: FormData) {
    "use server";
    return createChecklist(formData);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        כאן עורכים את הצ&apos;קליסטים שמופיעים בלשונית &quot;משימות וצ&apos;קליסטים&quot; של כל אירוע: סעיפים, קטגוריות, ותיבת הערות. שינוי נוסח
        או מחיקה של סעיף חלים על כל האירועים. מי רואה כל צ&apos;קליסט נקבע במסך &quot;תפקידים והרשאות&quot;.
      </p>

      {!canEdit && <p className="text-sm text-foreground/60">אפשר לצפות בצ&apos;קליסטים, אך אין לך הרשאה לערוך אותם.</p>}

      {canEdit && (
        <SaveDetailsForm
          action={create}
          message="הצ'קליסט נוצר"
          clearOnSuccess
          className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">צ&apos;קליסט חדש</span>
            <input name="label" required placeholder="למשל: צ'קליסט סגירה - מטבח" className={inputClass} />
          </label>
          <button type="submit" className={saveButton}>
            צור צ&apos;קליסט
          </button>
        </SaveDetailsForm>
      )}

      <div className={canEdit ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-80"}>
        {checklists.map((checklist, index) => (
          <ChecklistEditor key={checklist.key} checklist={checklist} index={index} total={checklists.length} />
        ))}
      </div>
    </div>
  );
}
