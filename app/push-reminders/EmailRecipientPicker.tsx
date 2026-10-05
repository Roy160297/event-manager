"use client";

import { useState } from "react";

interface Option {
  key: string;
  label: string;
}

interface RecipientValues {
  to_event_manager?: boolean | null;
  to_floor_manager?: boolean | null;
  to_salesperson?: boolean | null;
  recipient_staff_ids?: string[] | null;
}

export interface StaffOption {
  id: string;
  name: string;
  roleName?: string | null;
}

const EVENT_OPTIONS: Option[] = [
  { key: "event_manager", label: "מנהל האירוע" },
  { key: "floor_manager", label: "מנהל הפלור" },
  { key: "salesperson", label: "איש המכירות של האירוע" },
];

// Recipients are picked from a dropdown (like the push-notification form) and
// accumulate as removable chips, since an email reminder can go to several
// people at once. The chosen ones are submitted as hidden fields. Only the
// roles that are assigned per event (manager, floor manager, salesperson) are
// offered as such; every other position (chef, bar manager...) is the same
// person every time, so those are picked as fixed staff members.
export function EmailRecipientPicker({
  values,
  staff,
  inputClass,
}: {
  values?: RecipientValues;
  staff: StaffOption[];
  inputClass: string;
}) {
  const [selected, setSelected] = useState<string[]>(() => [
    ...(values?.to_event_manager ? ["event_manager"] : []),
    ...(values?.to_floor_manager ? ["floor_manager"] : []),
    ...(values?.to_salesperson ? ["salesperson"] : []),
    ...(values?.recipient_staff_ids ?? []).map((id) => `staff:${id}`),
  ]);

  const labelOf = (key: string): string => {
    const event = EVENT_OPTIONS.find((option) => option.key === key);
    if (event) return event.label;
    return staff.find((member) => `staff:${member.id}` === key)?.name ?? "איש צוות";
  };

  const available = (key: string) => !selected.includes(key);
  const idsWithPrefix = (prefix: string) => selected.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));

  return (
    <div className="flex flex-col gap-2">
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) setSelected((current) => [...current, e.target.value]);
        }}
        className={inputClass}
      >
        <option value="">הוסיפו נמען...</option>
        <optgroup label="לפי האירוע">
          {EVENT_OPTIONS.filter((option) => available(option.key)).map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="איש צוות קבוע">
          {staff
            .filter((member) => available(`staff:${member.id}`))
            .map((member) => (
              <option key={member.id} value={`staff:${member.id}`}>
                {member.name}
                {member.roleName ? ` (${member.roleName})` : ""}
              </option>
            ))}
        </optgroup>
      </select>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((key) => (
            <span
              key={key}
              className="flex items-center gap-1.5 rounded-full border border-border-classic bg-accent-soft px-3 py-1 text-sm"
            >
              {labelOf(key)}
              <button
                type="button"
                aria-label={`הסר ${labelOf(key)}`}
                onClick={() => setSelected((current) => current.filter((item) => item !== key))}
                className="text-foreground/60 hover:text-foreground"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.includes("event_manager") && <input type="hidden" name="to_event_manager" value="on" />}
      {selected.includes("floor_manager") && <input type="hidden" name="to_floor_manager" value="on" />}
      {selected.includes("salesperson") && <input type="hidden" name="to_salesperson" value="on" />}
      {idsWithPrefix("staff:").map((id) => (
        <input key={`staff-${id}`} type="hidden" name="recipient_staff_ids" value={id} />
      ))}
    </div>
  );
}
