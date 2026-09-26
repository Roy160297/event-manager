"use client";

import { useState } from "react";
import type { PushReminderRecipientType } from "@/lib/types";

const RECIPIENT_LABELS: Record<PushReminderRecipientType, string> = {
  event_manager: "מנהל האירוע",
  floor_manager: "מנהל הפלור של האירוע",
  role: "כל מי שבתפקיד...",
  fixed_staff: "איש צוות קבוע",
};

export function PushReminderRecipientFields({
  roles,
  staff,
  inputClass,
  labelClass,
  defaultType = "event_manager",
  defaultRoleId,
  defaultStaffId,
}: {
  roles: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  inputClass: string;
  labelClass: string;
  defaultType?: PushReminderRecipientType;
  defaultRoleId?: string | null;
  defaultStaffId?: string | null;
}) {
  const [type, setType] = useState<PushReminderRecipientType>(defaultType);

  return (
    <>
      <label className={labelClass}>
        <span>נמען</span>
        <select
          name="recipient_type"
          value={type}
          onChange={(e) => setType(e.target.value as PushReminderRecipientType)}
          className={inputClass}
        >
          {Object.entries(RECIPIENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {type === "role" && (
        <label className={labelClass}>
          <span>תפקיד</span>
          <select name="recipient_role_id" defaultValue={defaultRoleId ?? ""} required className={inputClass}>
            <option value="" disabled>
              בחרו תפקיד
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {type === "fixed_staff" && (
        <label className={labelClass}>
          <span>איש צוות</span>
          <select name="recipient_staff_id" defaultValue={defaultStaffId ?? ""} required className={inputClass}>
            <option value="" disabled>
              בחרו איש צוות
            </option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
