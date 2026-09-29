"use client";

import { useState } from "react";
import { WAITER_SKILLS, WAITER_SKILL_LABELS } from "@/lib/labels";
import type { WaiterSkill } from "@/lib/types";

// The role dropdown is narrowed to the skills the selected waiter is
// actually checked off for on the waiters page - assigning someone to a
// duty they're not marked capable of would just be wrong. Falls back to
// every skill when no waiter is picked yet, or when the picked waiter is
// checked for all of them (nothing meaningful to narrow to).
export function AssignWaiterForm({
  waiters,
  skillsByWaiter,
  action,
}: {
  waiters: { id: string; name: string }[];
  skillsByWaiter: Record<string, WaiterSkill[]>;
  action: (formData: FormData) => void;
}) {
  const [waiterId, setWaiterId] = useState("");

  const waiterSkills = waiterId ? (skillsByWaiter[waiterId] ?? []) : [];
  const roleOptions =
    waiterId && waiterSkills.length > 0 && waiterSkills.length < WAITER_SKILLS.length
      ? WAITER_SKILLS.filter((skill) => waiterSkills.includes(skill))
      : WAITER_SKILLS;

  return (
    <form action={action} className="flex items-center gap-2">
      <select
        name="waiter_id"
        value={waiterId}
        onChange={(e) => setWaiterId(e.target.value)}
        className="rounded-md border border-border-classic bg-surface px-2 py-1 text-sm"
      >
        <option value="" disabled>
          שבץ מלצר...
        </option>
        {waiters.map((waiter) => (
          <option key={waiter.id} value={waiter.id}>
            {waiter.name}
          </option>
        ))}
      </select>
      {/* Remounts (resetting the browser's own selection to the first option)
          whenever the option list itself changes, e.g. after picking a
          different waiter - otherwise a stale selection could linger even
          though it's no longer a valid option. */}
      <select
        key={roleOptions.join(",")}
        name="role"
        className="rounded-md border border-border-classic bg-surface px-2 py-1 text-sm"
      >
        {roleOptions.map((skill) => (
          <option key={skill} value={skill}>
            {WAITER_SKILL_LABELS[skill]}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-md border border-border-classic px-2 py-1 text-sm hover:bg-accent-soft">
        שבץ
      </button>
    </form>
  );
}
