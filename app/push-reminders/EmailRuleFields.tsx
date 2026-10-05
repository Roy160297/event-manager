"use client";

import { useState } from "react";
import type { EmailReminderAnchor, EmailReminderCondition } from "@/lib/types";

export const CONDITION_LABELS: Record<EmailReminderCondition, string> = {
  none: "ללא תנאי",
  additional_info_filled: "רק אם מולא מידע נוסף באירוע",
  supplier_dj_tzach_ziv: "רק אם הדיג'י באירוע הוא צח זיו",
};

// Form values for one email rule; every field is required, so an empty value
// means "not chosen yet" (a blank new rule, or something an AI draft left out).
export interface EmailRuleValues {
  title?: string | null;
  anchor?: EmailReminderAnchor | null;
  offset_days?: number | null;
  fallback_mode?: "skip" | "event" | null;
  fallback_offset_days?: number | null;
  match_mode?: "exact" | "on_or_after" | null;
  run_window?: "any" | "morning" | "evening" | null;
  condition?: EmailReminderCondition | null;
  to_event_manager?: boolean | null;
  to_salesperson?: boolean | null;
  extra_emails?: string | null;
  subject?: string | null;
  body?: string | null;
}

export function EmailRuleFields({
  values,
  inputClass,
  labelClass,
}: {
  values?: EmailRuleValues;
  inputClass: string;
  labelClass: string;
}) {
  const [anchor, setAnchor] = useState<string>(values?.anchor ?? "");
  const [fallbackMode, setFallbackMode] = useState<string>(values?.fallback_mode ?? "");

  return (
    <>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>שם פנימי</span>
        <input name="title" defaultValue={values?.title ?? ""} placeholder="למשל: תזכורת לעדכון סקיצה" required className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>נשלח ביחס ל...</span>
        <select name="anchor" value={anchor} onChange={(e) => setAnchor(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          <option value="event_date">תאריך האירוע</option>
          <option value="couple_meeting_date">תאריך פגישת הזוג</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>מספר ימים (שלילי = לפני, חיובי = אחרי, 0 = באותו יום)</span>
        <input name="offset_days" type="number" step={1} defaultValue={values?.offset_days ?? ""} placeholder="-1" required className={inputClass} />
      </label>

      {anchor === "couple_meeting_date" && (
        <>
          <label className={labelClass}>
            <span>אם לא הוזן תאריך פגישה</span>
            <select
              name="fallback_mode"
              value={fallbackMode}
              onChange={(e) => setFallbackMode(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                בחרו
              </option>
              <option value="skip">לא לשלוח</option>
              <option value="event">לשלוח ביחס לתאריך האירוע</option>
            </select>
          </label>
          {fallbackMode === "event" && (
            <label className={labelClass}>
              <span>ימים ביחס לתאריך האירוע (שלילי = לפני)</span>
              <input
                name="fallback_offset_days"
                type="number"
                step={1}
                defaultValue={values?.fallback_offset_days ?? ""}
                placeholder="-7"
                required
                className={inputClass}
              />
            </label>
          )}
        </>
      )}

      <label className={labelClass}>
        <span>אם המועד כבר עבר</span>
        <select name="match_mode" defaultValue={values?.match_mode ?? ""} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          <option value="exact">לשלוח רק בדיוק ביום המתאים</option>
          <option value="on_or_after">לשלוח פעם אחת ביום המתאים או אחריו</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>שעת שליחה</span>
        <select name="run_window" defaultValue={values?.run_window ?? ""} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          <option value="any">בכל ריצה של המערכת</option>
          <option value="morning">בבוקר</option>
          <option value="evening">בערב</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>תנאי</span>
        <select name="condition" defaultValue={values?.condition ?? ""} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
        <legend className="mb-1">נמענים (לפחות אחד)</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="to_event_manager" defaultChecked={values?.to_event_manager ?? false} />
          <span>מנהל האירוע</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="to_salesperson" defaultChecked={values?.to_salesperson ?? false} />
          <span>איש המכירות של האירוע</span>
        </label>
        <label className={`${labelClass} mt-1`}>
          <span>כתובות נוספות (מופרדות בפסיק)</span>
          <input name="extra_emails" defaultValue={values?.extra_emails ?? ""} placeholder="name@example.com, other@example.com" className={inputClass} />
        </label>
      </fieldset>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>נושא האימייל</span>
        <input name="subject" defaultValue={values?.subject ?? ""} required className={inputClass} />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>תוכן האימייל</span>
        <textarea name="body" defaultValue={values?.body ?? ""} required rows={6} className={inputClass} />
      </label>
    </>
  );
}
