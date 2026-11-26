-- An event has two phases for the floor staff: the reception (door, runners,
-- pilot, hall prep, stands) and the hall (runners, stands, tables). Runners,
-- family waiter, hostess and barista work the whole event. A waiter can have a
-- different place in each phase, so every assignment now says which phase it
-- belongs to.
alter table waiter_assignments add column if not exists phase text not null default 'hall'
  check (phase in ('event', 'reception', 'hall'));

update waiter_assignments set phase = 'event'
  where location_id is null and role in ('runner', 'family_waiter', 'hostess', 'barista', 'clearing');
update waiter_assignments set phase = 'reception'
  where location_id is null and role in ('door', 'piloting', 'hall_prep');

-- The same waiter may keep the same stand through both phases.
alter table waiter_assignments drop constraint if exists waiter_assignments_waiter_id_location_id_key;
alter table waiter_assignments add constraint waiter_assignments_waiter_location_phase_key
  unique (waiter_id, location_id, phase);
