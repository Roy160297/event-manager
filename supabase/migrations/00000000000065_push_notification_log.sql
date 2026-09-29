-- Web Push notification bodies get truncated by the OS (a few lines), with
-- no built-in way to see the rest - tapping a notification can only navigate
-- somewhere, not expand it. Every notification sendPushToStaff sends is
-- logged here so its push payload can carry a link to a page showing the
-- full, untruncated text instead of just opening the site's homepage.
create table if not exists push_notification_log (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table push_notification_log enable row level security;

create policy "push_notification_log read own" on push_notification_log for select
  using (staff_id = (select id from staff where user_id = auth.uid()));
