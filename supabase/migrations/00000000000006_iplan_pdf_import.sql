-- Fields captured from iPlan PDF import, extending events beyond what the
-- manual form covers, plus a new suppliers table. The schedule from the PDF
-- reuses the existing timeline_items table (same shape: label + approx_time).

alter table events add column if not exists bride_name text;
alter table events add column if not exists groom_name text;
alter table events add column if not exists end_time time;
alter table events add column if not exists sales_person_name text;
alter table events add column if not exists menu_package text;
alter table events add column if not exists service_style text;
alter table events add column if not exists guests_adults integer;
alter table events add column if not exists guests_children integer;
alter table events add column if not exists guests_reserve integer;
alter table events add column if not exists bride_parents_names text;
alter table events add column if not exists groom_parents_names text;
alter table events add column if not exists menu_notes text;
alter table events add column if not exists parking_notes text;

create table if not exists event_suppliers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  role text,
  name text not null,
  phone text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_suppliers_event on event_suppliers(event_id, sort_order);
