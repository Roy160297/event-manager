export const SUMMARY_REPORT_ANCHOR = "event-summary-report";

// Where opening an event leads. On the event's own day the person is there to
// run it and close it out, so it opens straight on the summary report (on the
// tasks tab, report expanded) - for whoever may read it. Any other day, or
// without that permission, it is the event's overview as always.
export function eventEntryHref(eventId: string, isToday: boolean, canReadSummary: boolean): string {
  return isToday && canReadSummary
    ? `/events/${eventId}/tasks?report=1#${SUMMARY_REPORT_ANCHOR}`
    : `/events/${eventId}`;
}
