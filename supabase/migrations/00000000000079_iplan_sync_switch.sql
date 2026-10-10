-- Master switch for the iPlan browser sync. Off unless an admin turns it on:
-- iPlan's terms of use forbid automated retrieval without its written permission.
alter table iplan_sync_status add column if not exists enabled boolean not null default false;
