-- Per-event waiter roster: who was actually booked for this event (uploaded
-- from the waitstaff manager's Excel under "סקיצה + מלצרים"). Distinct from
-- waiters (the permanent pool) and waiter_assignments (waiter -> table/stand);
-- the roster narrows which pool members are offered when assigning.
create table if not exists event_waiters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  waiter_id uuid not null references waiters(id) on delete cascade,
  shift_role text,
  arrival_time text,
  end_time text,
  created_at timestamptz not null default now(),
  unique (event_id, waiter_id)
);

create index if not exists idx_event_waiters_event on event_waiters(event_id);

alter table event_waiters enable row level security;
create policy "event_waiters select" on event_waiters for select using (has_permission('staffing', 'read'));
create policy "event_waiters insert" on event_waiters for insert with check (has_permission('staffing', 'write'));
create policy "event_waiters update" on event_waiters for update using (has_permission('staffing', 'write')) with check (has_permission('staffing', 'write'));
create policy "event_waiters delete" on event_waiters for delete using (has_permission('staffing', 'write'));
