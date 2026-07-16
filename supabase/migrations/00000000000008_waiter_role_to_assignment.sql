-- A waiter's role (waiter vs. runner/clearing staff) depends on the specific
-- event/assignment, not the person themselves, so it moves from the waiters
-- roster onto each individual assignment instead.
alter table waiter_assignments add column if not exists role text not null default 'waiter'
  check (role in ('waiter', 'runner'));

update waiter_assignments wa
set role = w.role
from waiters w
where wa.waiter_id = w.id and w.role is not null;

alter table waiters drop column if exists role;
