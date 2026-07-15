-- Extend events with additional detail fields + new event types.

alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('wedding', 'reverse_wedding', 'bat_mitzvah', 'bar_mitzvah', 'business_event', 'other'));

alter table events add column if not exists start_time time;
alter table events add column if not exists manager_id uuid references staff(id) on delete set null;
alter table events add column if not exists contact_email text;
alter table events add column if not exists contact_phone text;
alter table events add column if not exists estimated_guests integer;

create index if not exists idx_events_manager on events(manager_id);
