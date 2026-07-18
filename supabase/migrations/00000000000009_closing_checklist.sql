-- Per-event closing checklist: the item catalog itself lives in code
-- (lib/closingChecklist.ts) since it's the same fixed list for every event.
-- This table only stores which items have been checked off for a given event.
create table if not exists closing_checklist_checks (
  event_id uuid not null references events(id) on delete cascade,
  item_key text not null,
  checked_at timestamptz not null default now(),
  primary key (event_id, item_key)
);

-- App has no auth/RLS anywhere else (single-tenant internal tool using the
-- publishable key for everything) - mirror that here. New tables created via
-- the SQL editor can come back with RLS auto-enabled and no policies, which
-- silently empties selects and hard-blocks inserts/updates.
alter table closing_checklist_checks disable row level security;
