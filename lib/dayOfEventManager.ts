// Eldar covers the event manager's seat on the day itself, whoever the event
// is assigned to: he always sees that day's event, and signs the event
// manager's checklists in the assigned manager's place. Matched by name -
// he is a regular event-manager staff row with no events of his own.
export const DAY_OF_EVENT_MANAGER_NAME = "אלדר";

export function findDayOfEventManager<T extends { name: string }>(people: T[] | null | undefined): T | null {
  return people?.find((person) => person.name.trim() === DAY_OF_EVENT_MANAGER_NAME) ?? null;
}

// Whether `event` belongs in the list of events managed by `managerId`:
// the ones assigned to them, plus - for the day-of manager only - every
// event happening today.
export function isManagedBy(
  event: { manager_id: string | null; event_date: string },
  managerId: string,
  dayOfManagerId: string | null,
  today: string,
): boolean {
  return event.manager_id === managerId || (managerId === dayOfManagerId && event.event_date === today);
}
