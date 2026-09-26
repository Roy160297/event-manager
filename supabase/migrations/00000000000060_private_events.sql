-- Fully separate mini-system for Roy's own private events, deliberately kept
-- out of the venue's role/permission system entirely (never appears in the
-- admin roles grid, never grantable to anyone else) - gated purely by a
-- hardcoded owner check (staff.email), both here and in the app layout.

create table if not exists private_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null default 'wedding',
  event_date date not null,
  couple_meeting_date date,
  start_time time,
  end_time time,
  hall_name text,
  estimated_guests text,
  kids_meal_count text,
  glat_meal_count text,
  vegetarian_meal_count text,
  vegan_meal_count text,
  gluten_free_meal_count text,
  toddlers_under_2_count text,
  bride_parents_names text,
  groom_parents_names text,
  contact_email text,
  contact_email_2 text,
  contact_phone text,
  contact_phone_2 text,
  additional_info text,
  table_sketch_path text,
  sketch_seated_chairs_count text,
  created_at timestamptz not null default now()
);

create table if not exists private_event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private_events(id) on delete cascade,
  title text not null,
  description text,
  assignee_name text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now()
);

create table if not exists private_event_timeline_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private_events(id) on delete cascade,
  sort_order integer not null default 0,
  label text not null,
  approx_time time,
  notes text
);

create table if not exists private_event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private_events(id) on delete cascade,
  name text not null,
  party_size integer not null default 1,
  seating_table text,
  imported_at timestamptz not null default now()
);

create table if not exists private_event_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private_events(id) on delete cascade,
  location_type text not null default 'table' check (location_type in ('table', 'food_stand')),
  label text not null,
  capacity integer not null default 0
);

-- Central check every policy below defers to - true only for the one staff
-- row matching this hardcoded email, regardless of role/permissions. Mirrors
-- has_permission()'s SECURITY DEFINER pattern so it can read `staff`
-- regardless of the caller's own RLS visibility into it.
create or replace function is_private_events_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where staff.user_id = auth.uid()
      and staff.email = 'roy1602@gmail.com'
  );
$$;

alter table private_events enable row level security;
alter table private_event_tasks enable row level security;
alter table private_event_timeline_items enable row level security;
alter table private_event_guests enable row level security;
alter table private_event_locations enable row level security;

create policy "private_events owner" on private_events for all
  using (is_private_events_owner()) with check (is_private_events_owner());
create policy "private_event_tasks owner" on private_event_tasks for all
  using (is_private_events_owner()) with check (is_private_events_owner());
create policy "private_event_timeline_items owner" on private_event_timeline_items for all
  using (is_private_events_owner()) with check (is_private_events_owner());
create policy "private_event_guests owner" on private_event_guests for all
  using (is_private_events_owner()) with check (is_private_events_owner());
create policy "private_event_locations owner" on private_event_locations for all
  using (is_private_events_owner()) with check (is_private_events_owner());

insert into storage.buckets (id, name, public)
values ('private-event-sketches', 'private-event-sketches', false)
on conflict (id) do nothing;

drop policy if exists "private-event-sketches owner" on storage.objects;
create policy "private-event-sketches owner" on storage.objects for all
  using (bucket_id = 'private-event-sketches' and is_private_events_owner())
  with check (bucket_id = 'private-event-sketches' and is_private_events_owner());
