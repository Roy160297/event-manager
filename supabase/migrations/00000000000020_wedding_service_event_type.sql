-- Add "חתונה - הגשה" (plated-service wedding, as opposed to the existing
-- buffet-style "חתונה - מזנונים") as a selectable event type.
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('wedding', 'wedding_service', 'reverse_wedding', 'bat_mitzvah', 'bar_mitzvah', 'business_event', 'other'));
