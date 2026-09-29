-- Per-waiter capability matrix (distinct from waiter_assignments.role, which
-- is the waiter/runner role picked when assigning someone to a table for a
-- specific event) - a permanent set of skills each person in the pool is
-- qualified for, shown as a checkmark grid on the waiters page.
create table if not exists waiter_skills (
  id uuid primary key default gen_random_uuid(),
  waiter_id uuid not null references waiters(id) on delete cascade,
  skill text not null check (skill in ('runner', 'clearing', 'piloting', 'station', 'table', 'hall_prep', 'door')),
  unique (waiter_id, skill)
);

create index if not exists idx_waiter_skills_waiter on waiter_skills(waiter_id);

alter table waiter_skills enable row level security;
create policy "waiter_skills select" on waiter_skills for select using (has_permission('waiters', 'read'));
create policy "waiter_skills insert" on waiter_skills for insert with check (has_permission('waiters', 'write'));
create policy "waiter_skills delete" on waiter_skills for delete using (has_permission('waiters', 'write'));
