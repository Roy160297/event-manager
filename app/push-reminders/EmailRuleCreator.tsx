"use client";

import { useState } from "react";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { EmailRuleFields } from "./EmailRuleFields";
import { draftEmailRuleFromText } from "./emailActions";
import type { EmailRuleDraft } from "@/lib/ruleDraft";

// Highlights every required field the draft left empty.
const MISSING_HIGHLIGHT =
  "[&_input:required:invalid]:border-red-400 [&_select:required:invalid]:border-red-400 [&_textarea:required:invalid]:border-red-400";

export function EmailRuleCreator({
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
  const [draft, setDraft] = useState<EmailRuleDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  async function handleDraft() {
    if (!request.trim()) return;
    setIsPending(true);
    setError(null);
    try {
      const result = await draftEmailRuleFromText(request);
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
          <span className="font-medium">תארו במלל חופשי את התזכורת שתרצו ליצור</span>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={2}
            placeholder="למשל: שלח למנהל האירוע יום לפני האירוע תזכורת לוודא שכל הציוד מוכן"
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
        message="התזכורת נוצרה בהצלחה"
        clearOnSuccess
        className={`flex flex-col gap-3 border-t border-border-classic pt-3 ${draft ? MISSING_HIGHLIGHT : ""}`}
      >
        <p className="text-sm font-medium">{draft ? "טיוטת התזכורת" : "תזכורת חדשה באימייל"}</p>
        {draft && (
          <p className="rounded-md bg-accent-soft/60 p-2 text-sm">
            {draft.missing.length > 0
              ? `הטיוטה מוכנה. יש להשלים את השדות המסומנים באדום: ${draft.missing.join(", ")}.`
              : "הטיוטה מוכנה. בדקו את השדות ולחצו על הוספה."}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <EmailRuleFields values={draft ?? undefined} roles={roles} staff={staff} inputClass={inputClass} labelClass={labelClass} />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          הוסף תזכורת
        </button>
      </SaveDetailsForm>
    </div>
  );
}
