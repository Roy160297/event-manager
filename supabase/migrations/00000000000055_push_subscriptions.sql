-- Web Push subscriptions, one row per (staff member, browser/device) that
-- opted in - a staff member can have several (phone + desktop, or after
-- reinstalling), each with its own push endpoint and encryption keys. Only
-- ever sent to via the service-role client (lib/pushNotifications.ts), but
-- inserted/deleted by the staff member's own browser session (subscribing/
-- unsubscribing themselves), so RLS is scoped to "your own rows" rather than
-- locked out entirely like reminder_log.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions manage own" on push_subscriptions for all
  using (staff_id = (select id from staff where user_id = auth.uid()))
  with check (staff_id = (select id from staff where user_id = auth.uid()));
