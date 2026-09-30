-- Adds "family_waiter" (מלצרית משפחה) as an 8th waiter skill, alongside the
-- 7 added in the 00000000000063/64 migrations - both places that constrain
-- the allowed skill vocabulary need the new value.
alter table waiter_skills drop constraint if exists waiter_skills_skill_check;
alter table waiter_skills add constraint waiter_skills_skill_check
  check (skill in ('runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door', 'family_waiter'));

alter table waiter_assignments drop constraint if exists waiter_assignments_role_check;
alter table waiter_assignments add constraint waiter_assignments_role_check
  check (role in ('waiter', 'runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door', 'family_waiter'));
