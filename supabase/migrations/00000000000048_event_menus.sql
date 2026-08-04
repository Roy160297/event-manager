-- Per-event tasting menu (מזנונים / הגשה), imported from a Word doc and then
-- freely edited. One row per event - the whole document is edited/replaced
-- as a unit (like suppliers, unlike per-item lists like tasks), so it's
-- stored as a single JSONB blob of sections rather than child tables.
create table if not exists event_menus (
  event_id uuid primary key references events(id) on delete cascade,
  menu_type text not null check (menu_type in ('buffet', 'plated')),
  title text,
  subtitle text,
  linens_note text,
  -- [{ label: string, note: string | null, items: string[] }, ...]
  sections jsonb not null default '[]'::jsonb,
  -- Trailing bullet notes shared by both menu types (wine, seasonality
  -- disclaimer, water/soda) - free text, not per-dish.
  footer_notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table event_menus enable row level security;
create policy "event_menus select" on event_menus for select using (has_permission('menu', 'read'));
create policy "event_menus insert" on event_menus for insert with check (has_permission('menu', 'write'));
create policy "event_menus update" on event_menus for update using (has_permission('menu', 'write')) with check (has_permission('menu', 'write'));
create policy "event_menus delete" on event_menus for delete using (has_permission('menu', 'write'));

alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks', 'menu'
  ));

-- Seed with the same read/write matrix every role already has on 'events' -
-- the menu is event content in the same spirit (visible to whoever can see
-- the event, editable by whoever can edit it).
insert into role_permissions (role_id, resource, can_read, can_write)
select role_id, 'menu', can_read, can_write
from role_permissions
where resource = 'events'
on conflict (role_id, resource) do update set can_read = excluded.can_read, can_write = excluded.can_write;
