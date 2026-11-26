-- Hostess (מארחת) and barista (בריסטה) are event duties like the family waiter,
-- but not waiter skills, so they only widen the assignment role vocabulary.
alter table waiter_assignments drop constraint if exists waiter_assignments_role_check;
alter table waiter_assignments add constraint waiter_assignments_role_check
  check (role in ('waiter', 'runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door', 'family_waiter', 'hostess', 'barista'));

alter table waiter_assignments drop constraint if exists waiter_assignments_duty_has_no_location;
alter table waiter_assignments add constraint waiter_assignments_duty_has_no_location
  check (
    location_id is not null
    or role in ('runner', 'clearing', 'piloting', 'hall_prep', 'door', 'family_waiter', 'hostess', 'barista')
  );
