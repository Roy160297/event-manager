"use client";

import { useState } from "react";
import { sendTestPushReminderRule } from "./actions";

export function TestRuleButton({ ruleId }: { ruleId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleClick() {
    setIsPending(true);
    setMessage(null);
    try {
      const result = await sendTestPushReminderRule(ruleId);
      setIsError(result.sent === 0);
      setMessage(
        result.sent > 0
          ? `נשלחה בדיקה אליך (${result.sent} מכשירים)`
          : "לא נמצא מכשיר רשום לקבלת פוש עבורך - ודאו שהפעלתם התראות בדפדפן",
      );
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "שגיאה בשליחת הבדיקה");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="שולח בדיקה של ההתראה הזו אליך בלבד, ללא קשר לנמען המוגדר"
        className="rounded-full border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent-soft disabled:opacity-50"
      >
        {isPending ? "שולח..." : "שלח בדיקה"}
      </button>
      {message && <p className={`text-xs ${isError ? "text-red-600" : "text-foreground/60"}`}>{message}</p>}
    </div>
  );
}
