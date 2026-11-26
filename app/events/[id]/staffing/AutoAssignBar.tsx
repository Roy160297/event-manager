"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WAITER_SKILL_LABELS } from "@/lib/labels";
import { DUTY_QUOTAS, MAX_TABLES_PER_WAITER } from "@/lib/waiterDuties";
import { autoAssignBySkills, clearAllAssignments } from "./actions";

// One-click assignment of the event's roster by skill, plus a reset so it can
// be run again. The button only adds to what is already assigned.
export function AutoAssignBar({
  eventId,
  hasRoster,
  assignmentCount,
}: {
  eventId: string;
  hasRoster: boolean;
  assignmentCount: number;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAutoAssign() {
    setError(null);
    setNotice(null);
    setIsPending(true);
    try {
      const result = await autoAssignBySkills(eventId);
      const parts = [result.assigned > 0 ? `שובצו ${result.assigned} מלצרים.` : "אין מלצרים פנויים לשיבוץ."];
      for (const shortage of result.shortages) {
        const quota = DUTY_QUOTAS[shortage.duty] ?? 0;
        parts.push(
          `${WAITER_SKILL_LABELS[shortage.duty]}: חסרים ${shortage.missing} מתוך ${quota} (אין מספיק מלצרים עם הכישור).`,
        );
      }
      const { receptionStands, hallStands, tables } = result.unstaffed;
      if (receptionStands > 0) parts.push(`${receptionStands} עמדות בקבלת הפנים נשארו ללא מלצר.`);
      if (hallStands > 0) parts.push(`${hallStands} עמדות באולם נשארו ללא מלצר.`);
      if (tables > 0) parts.push(`${tables} שולחנות נשארו ללא מלצר.`);
      setNotice(parts.join(" "));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשיבוץ");
    } finally {
      setIsPending(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("להסיר את כל השיבוצים של האירוע (שולחנות, עמדות ותפקידים)?")) return;
    setError(null);
    setNotice(null);
    setIsPending(true);
    try {
      await clearAllAssignments(eventId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בניקוי השיבוצים");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border-classic bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">שיבוץ לפי כישורים</h2>
          <p className="text-xs text-foreground/60">
            כל האירוע: ראנרים {DUTY_QUOTAS.runner}, מלצרית משפחה, מארחת ובריסטה לפי הקובץ. קבלת הפנים: מלצר דלת{" "}
            {DUTY_QUOTAS.door}, הכנת אולם {DUTY_QUOTAS.hall_prep}, מלצר בכל עמדה וכל השאר פינויים. האולם: ג&apos;וקר {DUTY_QUOTAS.joker}, מלצר בכל עמדה, והשאר מכסים את
            השולחנות (עד {MAX_TABLES_PER_WAITER} לכל אחד). משלים רק את מה שעדיין לא שובץ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoAssign}
            disabled={isPending || !hasRoster}
            title={hasRoster ? undefined : "יש להעלות קודם קובץ מלצרים לאירוע"}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "משבץ..." : "שבץ אוטומטית"}
          </button>
          {assignmentCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="rounded-full border border-border-classic px-3 py-1.5 text-xs hover:bg-accent-soft disabled:opacity-50"
            >
              נקה את כל השיבוצים
            </button>
          )}
        </div>
      </div>
      {notice && <p className="rounded-md bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
