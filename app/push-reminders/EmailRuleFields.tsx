"use client";

import { useState } from "react";
import type { EmailReminderAnchor } from "@/lib/types";
import { EmailRecipientPicker, type StaffOption } from "./EmailRecipientPicker";

// Form values for one email rule; every field is required (except the
// recipients, where at least one of the options is), so an empty value means
// "not chosen yet" - a blank new rule, or something an AI draft left out.
export interface EmailRuleValues {
  title?: string | null;
  anchor?: EmailReminderAnchor | null;
  offset_days?: number | null;
  fallback_mode?: "skip" | "event" | null;
  fallback_offset_days?: number | null;
  match_mode?: "exact" | "on_or_after" | null;
  run_window?: "any" | "morning" | "evening" | null;
  to_event_manager?: boolean | null;
  to_floor_manager?: boolean | null;
  to_salesperson?: boolean | null;
  recipient_staff_ids?: string[] | null;
  extra_emails?: string | null;
  subject?: string | null;
  body?: string | null;
}

export function EmailRuleFields({
  values,
  staff,
  inputClass,
  labelClass,
}: {
  values?: EmailRuleValues;
  staff: StaffOption[];
  inputClass: string;
  labelClass: string;
}) {
  const [anchor, setAnchor] = useState<string>(values?.anchor ?? "");
  const [fallbackMode, setFallbackMode] = useState<string>(values?.fallback_mode ?? "");

  return (
    <>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>שם פנימי</span>
        <input name="title" defaultValue={values?.title ?? ""} placeholder="למשל: תזכורת לוודא ציוד" required className={inputClass} />
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
        <span className="text-xs text-foreground/50">
          כך נקבע התאריך שנבחר לשליחה. למשל: -1 ביחס לתאריך האירוע = יום לפני האירוע.
        </span>
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
        <span>אם התאריך שנבחר כבר עבר (למשל האירוע נוצר באיחור)</span>
        <select name="match_mode" defaultValue={values?.match_mode ?? ""} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          <option value="exact">לא לשלוח</option>
          <option value="on_or_after">לשלוח מיד, פעם אחת</option>
        </select>
      </label>
      <label className={labelClass}>
        <span>שעת שליחה</span>
        <select name="run_window" defaultValue={values?.run_window ?? ""} required className={inputClass}>
          <option value="" disabled>
            בחרו
          </option>
          <option value="any">מוקדם ככל האפשר בתאריך שנבחר (בדרך כלל בבוקר)</option>
          <option value="morning">בבוקר (בסביבות 08:00)</option>
          <option value="evening">בערב (בסביבות 18:00)</option>
        </select>
        <span className="text-xs text-foreground/50">שעון ישראל.</span>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2">
        <legend className="mb-1">נמענים (לפחות אחד)</legend>
        <EmailRecipientPicker values={values} staff={staff} inputClass={inputClass} />

        <label className={labelClass}>
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
