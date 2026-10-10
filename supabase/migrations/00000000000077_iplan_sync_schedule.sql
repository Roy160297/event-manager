-- The extension only asks the site "is it time to sync?"; these decide the answer.
alter table iplan_sync_status add column if not exists last_run_at timestamptz;
alter table iplan_sync_status add column if not exists interval_minutes integer not null default 180;
alter table iplan_sync_status add column if not exists active_from_hour integer not null default 7;
alter table iplan_sync_status add column if not exists active_to_hour integer not null default 22;
alter table iplan_sync_status add column if not exists run_requested_at timestamptz;

-- Admins can change the pace and ask for a sync from the admin page.
create policy "iplan_sync_status update" on iplan_sync_status for update
  using (has_permission('admin', 'write')) with check (has_permission('admin', 'write'));
