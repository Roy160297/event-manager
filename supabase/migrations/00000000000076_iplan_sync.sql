-- Automatic sync of events from iPlan (the venue CRM), fed by a browser
-- extension running in an already-logged-in iPlan session. Nothing here talks
-- to iPlan directly: the extension POSTs what it read to /api/iplan/sync.

-- iplan_event_id links an event here to its iPlan event; iplan_data is the
-- last snapshot read from iPlan, so a later sync only applies fields that
-- changed IN iPlan since then (edits made here to other fields are kept).
alter table events add column if not exists iplan_event_id text;
alter table events add column if not exists iplan_data jsonb;
alter table events add column if not exists iplan_synced_at timestamptz;
create unique index if not exists events_iplan_event_id_key on events (iplan_event_id) where iplan_event_id is not null;

-- Single-row heartbeat of the extension, to show "last sync" and detect a
-- stopped sync (e.g. the iPlan login expired).
create table if not exists iplan_sync_status (
  id boolean primary key default true check (id),
  last_ping_at timestamptz,
  last_ok_at timestamptz,
  last_status text,
  last_error text,
  last_summary jsonb
);
insert into iplan_sync_status (id) values (true) on conflict do nothing;

create table if not exists iplan_sync_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid references events(id) on delete set null,
  event_name text not null,
  kind text not null check (kind in ('created', 'updated', 'linked')),
  -- [{ field, label, from, to }, ...]
  changes jsonb not null default '[]'::jsonb
);
create index if not exists idx_iplan_sync_log_created on iplan_sync_log (created_at desc);

alter table iplan_sync_status enable row level security;
alter table iplan_sync_log enable row level security;
-- Written only by the server (service role); readable by whoever can see the admin area.
create policy "iplan_sync_status select" on iplan_sync_status for select using (has_permission('admin', 'read'));
create policy "iplan_sync_log select" on iplan_sync_log for select using (has_permission('admin', 'read'));
