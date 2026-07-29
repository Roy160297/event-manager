-- Tracks which (event, reminder rule, date) combinations already fired, so
-- the cron route can't double-send if it's triggered twice in one day (a
-- manual check plus the schedule, a retry, etc). Only ever touched by the
-- cron route's service-role client - no app-facing RLS policies needed.
create table if not exists reminder_log (
  event_id uuid not null references events(id) on delete cascade,
  rule_key text not null,
  sent_date date not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, rule_key, sent_date)
);

alter table reminder_log enable row level security;
