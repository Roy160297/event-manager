-- Broaden waiter_assignments.role beyond the old waiter/runner binary to the
-- full skill vocabulary from waiter_skills - assigning someone to a table
-- now specifies which duty they're covering there (ראנר/פינויים/פיילות/
-- עמדה/שולחן/הכנת אולם/מלצר דלת), not just the old two-option approximation.
-- 'waiter'/'runner' stay in the allowed set so existing rows remain valid
-- with no backfill needed - 'runner' already matches the new "runner" skill
-- value exactly.
alter table waiter_assignments drop constraint if exists waiter_assignments_role_check;
alter table waiter_assignments add constraint waiter_assignments_role_check
  check (role in ('waiter', 'runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door'));
