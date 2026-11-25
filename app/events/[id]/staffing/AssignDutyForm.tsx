"use client";

// Picks a waiter for one event-level duty. Waiters marked with that skill on
// the waiters page are listed first, the rest underneath.
export function AssignDutyForm({
  skilled,
  others,
  action,
}: {
  skilled: { id: string; name: string }[];
  others: { id: string; name: string }[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <select
        name="waiter_id"
        defaultValue=""
        className="rounded-md border border-border-classic bg-surface px-2 py-1 text-sm"
      >
        <option value="" disabled>
          שבץ מלצר...
        </option>
        {skilled.length > 0 && (
          <optgroup label="עם הכישור">
            {skilled.map((waiter) => (
              <option key={waiter.id} value={waiter.id}>
                {waiter.name}
              </option>
            ))}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label={skilled.length > 0 ? "אחרים" : "מלצרים"}>
            {others.map((waiter) => (
              <option key={waiter.id} value={waiter.id}>
                {waiter.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button type="submit" className="rounded-md border border-border-classic px-2 py-1 text-sm hover:bg-accent-soft">
        שבץ
      </button>
    </form>
  );
}
