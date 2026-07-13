-- Event Manager v1 schema
-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null check (event_type in ('wedding', 'bar_mitzvah', 'bat_mitzvah', 'other')),
  event_date date not null,
  venue text,
  status text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references staff(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now()
);

create table if not exists timeline_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sort_order integer not null default 0,
  label text not null,
  approx_time text,
  notes text
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'confirmed', 'declined')),
  party_size integer not null default 1,
  dietary_notes text,
  seating_table text,
  imported_at timestamptz not null default now()
);

-- Reusable roster: independent of any single event.
create table if not exists waiters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- Tables and food stands defined per event; a "table" location's label
-- is expected to match the corresponding guests.seating_table value.
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  location_type text not null check (location_type in ('table', 'food_stand')),
  label text not null,
  capacity integer not null default 0
);

create table if not exists waiter_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  waiter_id uuid not null references waiters(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  unique (waiter_id, location_id)
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  notif_type text not null check (notif_type in ('task', 'rsvp')),
  target_id uuid not null,
  channel text not null default 'email',
  sent_at timestamptz not null default now()
);

create index if not exists idx_tasks_event on tasks(event_id);
create index if not exists idx_timeline_items_event on timeline_items(event_id, sort_order);
create index if not exists idx_guests_event on guests(event_id);
create index if not exists idx_locations_event on locations(event_id);
create index if not exists idx_waiter_assignments_event on waiter_assignments(event_id);
