"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function EventManagerFilter({
  managers,
  defaultManagerId,
}: {
  managers: { id: string; name: string }[];
  defaultManagerId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("manager");
  // "all" is the explicit "show everyone" choice, distinct from the param
  // being absent (first load), which instead falls back to defaultManagerId.
  const current = raw === "all" ? "" : (raw ?? defaultManagerId ?? "");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("manager", e.target.value || "all");
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="rounded-full border border-border-classic bg-surface px-3 py-1.5 text-sm"
    >
      <option value="">כל המנהלים</option>
      {managers.map((manager) => (
        <option key={manager.id} value={manager.id}>
          {manager.name}
        </option>
      ))}
    </select>
  );
}
