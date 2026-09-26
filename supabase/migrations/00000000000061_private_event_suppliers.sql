create table if not exists private_event_suppliers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private_events(id) on delete cascade,
  role text,
  name text not null,
  phone text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table private_event_suppliers enable row level security;

create policy "private_event_suppliers owner" on private_event_suppliers for all
  using (is_private_events_owner()) with check (is_private_events_owner());
