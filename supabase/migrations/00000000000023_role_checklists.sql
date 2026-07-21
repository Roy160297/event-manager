-- Four new role-specific closing checklists (Floor Manager, Bar, Kitchen,
-- Barista) alongside the existing event-manager one. One shared table keyed
-- by which checklist a row belongs to, rather than four near-identical
-- tables - has_permission() is already generic over any resource string, so
-- passing the row's own checklist_key into it covers all four with one set
-- of RLS policies.
create table if not exists role_checklist_checks (
  event_id uuid not null references events(id) on delete cascade,
  checklist_key text not null check (checklist_key in (
    'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
  )),
  item_key text not null,
  checked_at timestamptz not null default now(),
  primary key (event_id, checklist_key, item_key)
);

alter table role_checklist_checks enable row level security;
create policy "role_checklist_checks select" on role_checklist_checks for select
  using (has_permission(checklist_key, 'read'));
create policy "role_checklist_checks insert" on role_checklist_checks for insert
  with check (has_permission(checklist_key, 'write'));
create policy "role_checklist_checks update" on role_checklist_checks for update
  using (has_permission(checklist_key, 'write')) with check (has_permission(checklist_key, 'write'));
create policy "role_checklist_checks delete" on role_checklist_checks for delete
  using (has_permission(checklist_key, 'write'));

alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
  ));

insert into roles (name) values ('מנהל בר'), ('שף'), ('בריסטה'), ('טבח') on conflict (name) do nothing;

-- Admin keeps full visibility into every new resource, same as every prior addition.
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, true, true
from roles r, unnest(array[
  'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
]) as res
where r.name = 'מנהל מערכת'
on conflict (role_id, resource) do update set can_read = true, can_write = true;

-- Sensible default grants for the new roles - editable later via the
-- Roles & Permissions grid. Chef and Cook share the one kitchen checklist
-- since no separate "chef checklist" exists.
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'bar_checklist', true, true from roles r where r.name = 'מנהל בר'
on conflict (role_id, resource) do update set can_read = true, can_write = true;

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'kitchen_checklist', true, true from roles r where r.name in ('שף', 'טבח')
on conflict (role_id, resource) do update set can_read = true, can_write = true;

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'barista_checklist', true, true from roles r where r.name = 'בריסטה'
on conflict (role_id, resource) do update set can_read = true, can_write = true;
