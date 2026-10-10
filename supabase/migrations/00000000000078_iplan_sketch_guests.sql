-- The iPlan sync also brings in each event's hall sketch (the day before the
-- event) and guest list (on the day). The hashes let a later pass skip files
-- that did not change; the synced_at columns tell the site what is still due.
alter table events add column if not exists iplan_sketch_hash text;
alter table events add column if not exists iplan_sketch_synced_at timestamptz;
alter table events add column if not exists iplan_guests_hash text;
alter table events add column if not exists iplan_guests_synced_at timestamptz;

alter table iplan_sync_log drop constraint if exists iplan_sync_log_kind_check;
alter table iplan_sync_log add constraint iplan_sync_log_kind_check
  check (kind in ('created', 'updated', 'linked', 'sketch', 'guests'));
