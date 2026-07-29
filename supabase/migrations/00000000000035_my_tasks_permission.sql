-- Gate the "המשימות שלי" (My Tasks) page behind its own permission resource
-- instead of reusing 'tasks', so it can be granted/revoked independently in
-- the Roles & Permissions grid.
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks'
  ));

-- Seed my_tasks with the same read/write matrix every role already has on
-- 'tasks', since My Tasks is just a personal, cross-event view of the same
-- underlying task data.
insert into role_permissions (role_id, resource, can_read, can_write)
select role_id, 'my_tasks', can_read, can_write
from role_permissions
where resource = 'tasks'
on conflict (role_id, resource) do update set can_read = excluded.can_read, can_write = excluded.can_write;
