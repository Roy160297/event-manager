import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import type { EventTypeInfo } from "@/lib/eventTypes";
import { addEventType, deleteEventType, moveEventType, updateEventType } from "./eventTypeActions";

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const smallButton = "rounded-md border border-border-classic px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40";
const saveButton = "rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft";

function EventTypeRow({ type, first, last }: { type: EventTypeInfo; first: boolean; last: boolean }) {
  async function save(formData: FormData) {
    "use server";
    return updateEventType(type.key, formData);
  }
  async function up() {
    "use server";
    await moveEventType(type.key, "up");
  }
  async function down() {
    "use server";
    await moveEventType(type.key, "down");
  }
  async function remove(): Promise<string | void> {
    "use server";
    return deleteEventType(type.key);
  }

  return (
    <li className="flex flex-wrap items-start gap-2">
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
      <SaveDetailsForm action={save} message="סוג האירוע נשמר" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <input name="label" defaultValue={type.label} required aria-label="שם סוג האירוע" className={`${inputClass} min-w-0 flex-1 basis-48`} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="is_business" defaultChecked={type.isBusiness} className="h-4 w-4" />
          אירוע עסקי (בלי פרטי חתונה)
        </label>
        <button type="submit" className={saveButton}>
          שמור
        </button>
      </SaveDetailsForm>
      <SaveDetailsForm action={remove} message="הסוג נמחק">
        <ConfirmSubmitButton
          message={`למחוק את סוג האירוע "${type.label}"?`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">מחק סוג אירוע</span>
        </ConfirmSubmitButton>
      </SaveDetailsForm>
    </li>
  );
}

// The venue's event types: what is offered when an event is created, and what
// checklists and schedule templates can be limited to.
export function EventTypes({ types, canEdit }: { types: EventTypeInfo[]; canEdit: boolean }) {
  async function create(formData: FormData) {
    "use server";
    return addEventType(formData);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <p className="font-serif text-lg font-bold">סוגי אירוע</p>
      <p className="text-xs text-foreground/60">
        הסוגים שאפשר לבחור ביצירת אירוע ובעריכתו. &quot;אירוע עסקי&quot; מסתיר את פרטי החתונה (שמות ההורים, מנות ילדים, פגישת זוג) ופוטר
        את האירוע ממיילי התזכורת של הפגישה עם הזוג. לא ניתן למחוק סוג שיש אירועים או צ&apos;קליסטים או תבניות שמשתמשים בו.
      </p>

      <ul className={canEdit ? "flex flex-col gap-2" : "pointer-events-none flex flex-col gap-2 opacity-80"}>
        {types.map((type, index) => (
          <EventTypeRow key={type.key} type={type} first={index === 0} last={index === types.length - 1} />
        ))}
      </ul>

      {canEdit && (
        <SaveDetailsForm
          action={create}
          message="סוג האירוע נוסף"
          clearOnSuccess
          className="flex flex-wrap items-end gap-3 border-t border-border-classic pt-3"
        >
          <label className="flex min-w-0 flex-1 basis-48 flex-col gap-1 text-sm">
            <span className="font-medium">סוג אירוע חדש</span>
            <input name="label" required placeholder="למשל: ברית" className={inputClass} />
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-sm">
            <input type="checkbox" name="is_business" className="h-4 w-4" />
            אירוע עסקי
          </label>
          <button type="submit" className={saveButton}>
            הוסף סוג
          </button>
        </SaveDetailsForm>
      )}
    </section>
  );
}
