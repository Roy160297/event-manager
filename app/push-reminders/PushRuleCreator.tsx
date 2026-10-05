"use client";

import { useState } from "react";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { PushReminderRecipientFields } from "@/components/PushReminderRecipientFields";
import { draftPushRuleFromText } from "./actions";
import type { PushRuleDraft } from "@/lib/ruleDraft";

// Highlights every required field the draft left empty, so what still needs
// filling in is obvious.
const MISSING_HIGHLIGHT =
  "[&_input:required:invalid]:border-red-400 [&_select:required:invalid]:border-red-400 [&_textarea:required:invalid]:border-red-400";

export function PushRuleCreator({
  roles,
  staff,
  inputClass,
  labelClass,
  createAction,
}: {
  roles: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  inputClass: string;
  labelClass: string;
  createAction: (formData: FormData) => Promise<string | void>;
}) {
  const [request, setRequest] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PushRuleDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  async function handleDraft() {
    if (!request.trim()) return;
    setIsPending(true);
    setError(null);
    try {
      const result = await draftPushRuleFromText(request);
      setDraft(result);
      setDraftVersion((version) => version + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת הטיוטה");
    } finally {
      setIsPending(false);
    }
  }

  async function handleCreate(formData: FormData) {
    const result = await createAction(formData);
    if (!result) {
      setDraft(null);
      setRequest("");
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">תארו במילים את ההתראה</span>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={2}
            placeholder="למשל: צור לי התראה 15 דקות אחרי תחילת החופה לחלק לחם בשולחנות"
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handleDraft}
          disabled={isPending || !request.trim()}
          className="self-start rounded-full border-2 border-accent bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-50"
        >
          {isPending ? "מכין טיוטה..." : "הכן טיוטה"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <SaveDetailsForm
        key={draftVersion}
        action={handleCreate}
        message="ההתראה נוצרה בהצלחה"
        clearOnSuccess
        className={`flex flex-col gap-3 border-t border-border-classic pt-3 ${draft ? MISSING_HIGHLIGHT : ""}`}
      >
        <p className="text-sm font-medium">{draft ? "טיוטת ההתראה" : "התראה חדשה"}</p>
        {draft && (
          <p className="rounded-md bg-accent-soft/60 p-2 text-sm">
            {draft.missing.length > 0
              ? `הטיוטה מוכנה. יש להשלים את השדות המסומנים באדום: ${draft.missing.join(", ")}.`
              : "הטיוטה מוכנה. בדקו את השדות ולחצו על הוספה."}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span>שם פנימי</span>
            <input name="title" defaultValue={draft?.title ?? ""} placeholder="למשל: העלאת צ'ילר לחופה" required className={inputClass} />
          </label>
          <label className={labelClass}>
            <span>שם השלב בלוח הזמנים לעגינה</span>
            <input
              name="anchor_label"
              defaultValue={draft?.anchor_label ?? ""}
              placeholder="חופה"
              required
              list="timeline-step-labels"
              className={inputClass}
            />
            <span className="text-xs text-foreground/50">
              חייב להתאים בדיוק לשם השלב בלוח הזמנים, אחרת ההתראה לעולם לא תופעל בלי הודעת שגיאה.
            </span>
          </label>
          <label className={labelClass}>
            <span>הפרש דקות (שלילי = לפני השלב, חיובי = אחריו)</span>
            <input
              name="offset_minutes"
              type="number"
              defaultValue={draft?.offset_minutes ?? ""}
              placeholder="-20"
              required
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span>כותרת ההתראה</span>
            <input
              name="notification_title"
              defaultValue={draft?.notification_title ?? ""}
              placeholder="תזכורת: יש להעלות צ'ילר לחופה"
              required
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            <span>תוכן ההתראה</span>
            <textarea name="notification_body" defaultValue={draft?.notification_body ?? ""} required rows={2} className={inputClass} />
          </label>
          <PushReminderRecipientFields
            roles={roles}
            staff={staff}
            inputClass={inputClass}
            labelClass={labelClass}
            defaultType={draft?.recipient_type ?? ""}
            defaultRoleId={draft?.recipient_role_id}
            defaultStaffId={draft?.recipient_staff_id}
          />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          הוסף התראה
        </button>
      </SaveDetailsForm>
    </div>
  );
}
