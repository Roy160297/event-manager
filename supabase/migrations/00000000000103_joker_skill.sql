-- "Joker" (ג'וקר): a hall waiter who floats and helps wherever needed. A waiter
-- skill, and a hall-phase duty with no table/stand.
alter table waiter_skills drop constraint if exists waiter_skills_skill_check;
alter table waiter_skills add constraint waiter_skills_skill_check
  check (skill in ('runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door', 'family_waiter', 'joker'));

alter table waiter_assignments drop constraint if exists waiter_assignments_role_check;
alter table waiter_assignments add constraint waiter_assignments_role_check
  check (role in ('waiter', 'runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door', 'family_waiter', 'hostess', 'barista', 'joker'));

alter table waiter_assignments drop constraint if exists waiter_assignments_duty_has_no_location;
alter table waiter_assignments add constraint waiter_assignments_duty_has_no_location
  check (
    location_id is not null
    or role in ('runner', 'clearing', 'piloting', 'hall_prep', 'door', 'family_waiter', 'hostess', 'barista', 'joker')
  );
