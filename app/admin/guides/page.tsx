import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { loadGuides, type Guide, type GuideSection } from "@/lib/guides";
import {
  addItem,
  addSection,
  deleteItem,
  deleteSection,
  moveItem,
  moveSection,
  renameSection,
  updateIntro,
  updateItem,
} from "./actions";

const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 text-sm";
const smallButton = "rounded-md border border-border-classic px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40";
const saveButton = "rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft";
const dangerButton = "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50";

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

function ItemEditor({ sectionId, item, first, last }: { sectionId: string; item: GuideSection["items"][number]; first: boolean; last: boolean }) {
  async function save(formData: FormData) {
    "use server";
    return updateItem(item.id, formData);
  }
  async function up() {
    "use server";
    await moveItem(sectionId, item.id, "up");
  }
  async function down() {
    "use server";
    await moveItem(sectionId, item.id, "down");
  }
  async function remove() {
    "use server";
    await deleteItem(item.id);
  }

  return (
    <li className="flex flex-wrap items-start gap-2">
      <MoveButtons onUp={up} onDown={down} first={first} last={last} />
      <SaveDetailsForm action={save} message="הסעיף נשמר" className="flex min-w-0 flex-1 items-start gap-2">
        <textarea name="text" defaultValue={item.text} required rows={2} aria-label="נוסח הסעיף" className={`${inputClass} min-w-0 flex-1`} />
        <button type="submit" className={saveButton}>
          שמור
        </button>
      </SaveDetailsForm>
      <form action={remove}>
        <ConfirmSubmitButton message="למחוק את הסעיף?" className={dangerButton}>
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">מחק סעיף</span>
        </ConfirmSubmitButton>
      </form>
    </li>
  );
}

function SectionEditor({ pageKey, section, first, last }: { pageKey: string; section: GuideSection; first: boolean; last: boolean }) {
  async function rename(formData: FormData) {
    "use server";
    return renameSection(section.id, formData);
  }
  async function up() {
    "use server";
    await moveSection(pageKey, section.id, "up");
  }
  async function down() {
    "use server";
    await moveSection(pageKey, section.id, "down");
  }
  async function remove() {
    "use server";
    await deleteSection(section.id);
  }
  async function newItem(formData: FormData) {
    "use server";
    return addItem(section.id, formData);
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border-classic p-3">
      <div className="flex flex-wrap items-center gap-2">
        <MoveButtons onUp={up} onDown={down} first={first} last={last} />
        <SaveDetailsForm action={rename} message="השם עודכן" className="flex flex-1 items-center gap-2">
          <input name="label" defaultValue={section.label} required aria-label="שם הקטגוריה" className={`${inputClass} min-w-0 flex-1 font-medium`} />
          <button type="submit" className={saveButton}>
            שמור
          </button>
        </SaveDetailsForm>
        <form action={remove}>
          <ConfirmSubmitButton
            message={`למחוק את הקטגוריה "${section.label}" ואת כל ${section.items.length} הסעיפים שבה?`}
            className={dangerButton}
          >
            <TrashIcon className="h-4 w-4" />
            מחק קטגוריה
          </ConfirmSubmitButton>
        </form>
      </div>

      <ul className="flex flex-col gap-2">
        {section.items.map((item, index) => (
          <ItemEditor key={item.id} sectionId={section.id} item={item} first={index === 0} last={index === section.items.length - 1} />
        ))}
        {section.items.length === 0 && <li className="text-sm text-foreground/60">אין סעיפים בקטגוריה.</li>}
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

function GuideEditor({ guide }: { guide: Guide }) {
  async function saveIntro(formData: FormData) {
    "use server";
    return updateIntro(guide.key, formData);
  }
  async function newSection(formData: FormData) {
    "use server";
    return addSection(guide.key, formData);
  }

  return (
    <details className="rounded-lg border border-border-classic bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {guide.title} <span className="text-foreground/60">({guide.sections.length} קטגוריות)</span>
      </summary>

      <div className="mt-4 flex flex-col gap-4">
        <SaveDetailsForm
          action={saveIntro}
          message="הפתיח נשמר"
          className="flex flex-col gap-2 rounded-md border border-border-classic bg-background p-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">משפט פתיחה מתחת לכותרת</span>
            <textarea name="intro" defaultValue={guide.intro} rows={2} className={inputClass} />
          </label>
          <button type="submit" className={`${saveButton} self-start`}>
            שמור
          </button>
        </SaveDetailsForm>

        {guide.sections.map((section, index) => (
          <SectionEditor key={section.id} pageKey={guide.key} section={section} first={index === 0} last={index === guide.sections.length - 1} />
        ))}

        <SaveDetailsForm
          action={newSection}
          message="הקטגוריה נוספה"
          clearOnSuccess
          className="flex flex-col gap-2 border-t border-border-classic pt-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">קטגוריה חדשה</span>
            <input name="label" required className={inputClass} />
          </label>
          <button type="submit" className={saveButton}>
            הוסף קטגוריה
          </button>
        </SaveDetailsForm>
      </div>
    </details>
  );
}

export default async function GuidesAdminPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const guides = await loadGuides(await createClient());

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        כאן עורכים את הטקסט של שני המדריכים שבתפריט הראשי: &quot;פגישה עם זוג&quot; ו&quot;סד&quot;פ ניהול אירוע&quot;. כל מדריך בנוי מקטגוריות, וכל קטגוריה
        מכילה סעיפים. שינוי חל מיד על כל מי שפותח את המדריך.
      </p>
      {!canEdit && <p className="text-sm text-foreground/60">אפשר לצפות במדריכים, אך אין לך הרשאה לערוך אותם.</p>}
      <div className={canEdit ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-80"}>
        {guides.map((guide) => (
          <GuideEditor key={guide.key} guide={guide} />
        ))}
      </div>
    </div>
  );
}
