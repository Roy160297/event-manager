-- Event types (wedding, bar mitzvah, business event...) were a fixed list in the
-- source and a CHECK constraint on events.event_type. They now live in a table the
-- venue edits from the app (venue settings): add, rename, reorder, remove.
create table if not exists event_types (
  key text primary key,
  label text not null,
  -- A business-style event: the family details of a celebration (parents' names,
  -- kids' meals, couple meeting...) are hidden for it, and reminder emails skip it.
  is_business boolean not null default false,
  sort_order integer not null default 0
);

alter table event_types enable row level security;
create policy "event_types select" on event_types for select using (is_staff_member());
create policy "event_types insert" on event_types for insert with check (has_permission('venue_settings', 'write'));
create policy "event_types update" on event_types for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "event_types delete" on event_types for delete using (has_permission('venue_settings', 'write'));

insert into event_types (key, label, is_business, sort_order) values
  ('wedding', $t$חתונה - מזנונים$t$, false, 10),
  ('wedding_service', $t$חתונה - הגשה$t$, false, 20),
  ('reverse_wedding', $t$חתונה הפוכה - מזנונים$t$, false, 30),
  ('reverse_wedding_service', $t$חתונה הפוכה - הגשה$t$, false, 40),
  ('bat_mitzvah', $t$בת מצווה$t$, false, 50),
  ('bar_mitzvah', $t$בר מצווה$t$, false, 60),
  ('business_event', $t$אירוע עסקי$t$, true, 70),
  ('other', $t$אחר$t$, false, 80)
on conflict (key) do nothing;

-- Any event type key is allowed from now on (validated in the app).
alter table events drop constraint if exists events_event_type_check;
