"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function EventManagerFilter({ managers }: { managers: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("manager") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("manager", e.target.value);
    else params.delete("manager");
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
