-- Event-level duties: besides a table / food stand, a waiter can be assigned
-- to a duty for the whole event (door, runners, hall prep, clearing, ...).
-- Such a row has no location - the duty itself is the row's `role`.
alter table waiter_assignments alter column location_id drop not null;

alter table waiter_assignments drop constraint if exists waiter_assignments_duty_has_no_location;
alter table waiter_assignments add constraint waiter_assignments_duty_has_no_location
  check (
    location_id is not null
    or role in ('runner', 'clearing', 'piloting', 'hall_prep', 'door', 'family_waiter')
  );

-- unique (waiter_id, location_id) treats NULLs as distinct, so a waiter could
-- be given the same duty twice; this index closes that gap.
create unique index if not exists idx_waiter_assignments_event_duty
  on waiter_assignments (event_id, waiter_id, role)
  where location_id is null;
