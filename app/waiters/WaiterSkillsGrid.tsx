"use client";

import { useState } from "react";
import { setWaiterSkill } from "./actions";
import { WAITER_SKILLS, WAITER_SKILL_LABELS } from "@/lib/labels";
import type { WaiterRow, WaiterSkill, WaiterSkillRow } from "@/lib/types";

type SkillsState = Record<string, Record<WaiterSkill, boolean>>;

function buildInitialState(waiters: WaiterRow[], skillsByWaiter: Record<string, WaiterSkillRow[]>): SkillsState {
  const state: SkillsState = {};
  for (const waiter of waiters) {
    const skillSet = new Set((skillsByWaiter[waiter.id] ?? []).map((s) => s.skill));
    state[waiter.id] = Object.fromEntries(WAITER_SKILLS.map((skill) => [skill, skillSet.has(skill)])) as Record<
      WaiterSkill,
      boolean
    >;
  }
  return state;
}

// Mirrors app/admin/roles/PermissionGrid.tsx's exact pattern: an optimistic
// checkmark grid (flip immediately, persist in the background, roll back
// only on failure) so ticking through many waiters/skills doesn't wait on a
// round-trip per click.
export function WaiterSkillsGrid({
  waiters,
  skillsByWaiter,
  readOnly = false,
}: {
  waiters: WaiterRow[];
  skillsByWaiter: Record<string, WaiterSkillRow[]>;
  readOnly?: boolean;
}) {
  const [state, setState] = useState<SkillsState>(() => buildInitialState(waiters, skillsByWaiter));
  const [error, setError] = useState<string | null>(null);

  function toggle(waiterId: string, skill: WaiterSkill, checked: boolean) {
    if (readOnly) return;
    setError(null);
    setState((prev) => ({ ...prev, [waiterId]: { ...prev[waiterId], [skill]: checked } }));

    setWaiterSkill(waiterId, skill, checked).catch((err) => {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון הכישור");
      setState((prev) => ({ ...prev, [waiterId]: { ...prev[waiterId], [skill]: !checked } }));
    });
  }

  if (waiters.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-border-classic">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-classic bg-accent-soft/40">
              <th className="sticky right-0 bg-accent-soft/40 px-3 py-2 text-start font-medium">מלצר/ית</th>
              {WAITER_SKILLS.map((skill) => (
                <th key={skill} className="border-s border-border-classic px-3 py-2 text-center font-medium">
                  {WAITER_SKILL_LABELS[skill]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waiters.map((waiter) => (
              <tr key={waiter.id} className="border-b border-border-classic last:border-b-0">
                <td className="sticky right-0 bg-background px-3 py-2 font-medium">{waiter.name}</td>
                {WAITER_SKILLS.map((skill) => (
                  <td key={skill} className="border-s border-border-classic px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={state[waiter.id][skill]}
                      disabled={readOnly}
                      onChange={(e) => toggle(waiter.id, skill, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
