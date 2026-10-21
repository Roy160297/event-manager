"use client";

import { createContext, useContext, useMemo } from "react";
import { FALLBACK_EVENT_TYPES, eventTypeLabel, isBusinessType, labelsOf, type EventTypeInfo } from "@/lib/eventTypes";

const EventTypesContext = createContext<EventTypeInfo[]>(FALLBACK_EVENT_TYPES);

// Makes the venue's event types available to every client component under it
// (the root layout provides them).
export function EventTypesProvider({ types, children }: { types: EventTypeInfo[]; children: React.ReactNode }) {
  return <EventTypesContext.Provider value={types}>{children}</EventTypesContext.Provider>;
}

export function useEventTypes(): EventTypeInfo[] {
  return useContext(EventTypesContext);
}

export function useEventTypeLabels(): Record<string, string> {
  const types = useEventTypes();
  return useMemo(() => labelsOf(types), [types]);
}

// label(key) for a type key, "—" when there is none.
export function useEventTypeLabel(): (key: string | null | undefined) => string {
  const labels = useEventTypeLabels();
  return (key) => eventTypeLabel(labels, key);
}

export function useIsBusinessType(): (key: string | null | undefined) => boolean {
  const types = useEventTypes();
  return (key) => isBusinessType(types, key);
}
