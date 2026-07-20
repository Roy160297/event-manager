-- Split "reverse wedding" the same way "wedding" was split: buffet-style
-- (existing "reverse_wedding") vs. plated-service ("reverse_wedding_service").
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('wedding', 'wedding_service', 'reverse_wedding', 'reverse_wedding_service', 'bat_mitzvah', 'bar_mitzvah', 'business_event', 'other'));
