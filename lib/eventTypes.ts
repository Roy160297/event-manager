// Event types as the venue defined them (the event_types table). This module is
// plain data and helpers, safe to use from both server and client code; reading the
// table is in lib/eventTypesServer.ts and the client-side access in
// components/EventTypesProvider.tsx.
export interface EventTypeInfo {
  key: string;
  label: string;
  // A business-style event: the family details of a celebration are hidden for it.
  isBusiness: boolean;
  sortOrder: number;
}

interface EventTypeRow {
  key: string;
  label: string;
  is_business: boolean;
  sort_order: number;
}

// Only used if the table cannot be read at all, so a database hiccup never leaves
// the app without any event type.
export const FALLBACK_EVENT_TYPES: EventTypeInfo[] = [
  { key: "wedding", label: "חתונה - מזנונים", isBusiness: false, sortOrder: 10 },
  { key: "wedding_service", label: "חתונה - הגשה", isBusiness: false, sortOrder: 20 },
  { key: "reverse_wedding", label: "חתונה הפוכה - מזנונים", isBusiness: false, sortOrder: 30 },
  { key: "reverse_wedding_service", label: "חתונה הפוכה - הגשה", isBusiness: false, sortOrder: 40 },
  { key: "bat_mitzvah", label: "בת מצווה", isBusiness: false, sortOrder: 50 },
  { key: "bar_mitzvah", label: "בר מצווה", isBusiness: false, sortOrder: 60 },
  { key: "business_event", label: "אירוע עסקי", isBusiness: true, sortOrder: 70 },
  { key: "other", label: "אחר", isBusiness: false, sortOrder: 80 },
];

export function assembleEventTypes(rows: EventTypeRow[]): EventTypeInfo[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({ key: row.key, label: row.label, isBusiness: row.is_business, sortOrder: row.sort_order }));
}

export function labelsOf(types: EventTypeInfo[]): Record<string, string> {
  return Object.fromEntries(types.map((type) => [type.key, type.label]));
}

// The label of a type; an unknown key (a type removed since) shows as its key
// rather than disappearing, and no type shows as a dash.
export function eventTypeLabel(labels: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return labels[key] ?? key;
}

export function isBusinessType(types: EventTypeInfo[], key: string | null | undefined): boolean {
  return !!key && types.some((type) => type.key === key && type.isBusiness);
}

// A key that exists among the types: the one given if it does, else "other" if the
// venue has it, else the first type. For values that come from outside (an import,
// the iPlan sync) and may name a type this venue does not have.
export function resolveEventType(types: EventTypeInfo[], key: string | null | undefined): string {
  if (key && types.some((type) => type.key === key)) return key;
  return types.find((type) => type.key === "other")?.key ?? types[0]?.key ?? "other";
}

// A new type's key: stable, unique, never reused.
export function newEventTypeKey(): string {
  return `t_${Math.random().toString(16).slice(2, 10)}`;
}
