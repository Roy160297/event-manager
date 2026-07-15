-- Classify serving staff by role (e.g. waiter vs. runner/clearing staff).
alter table waiters add column if not exists role text not null default 'waiter'
  check (role in ('waiter', 'runner'));
