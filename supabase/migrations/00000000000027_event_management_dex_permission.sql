-- Gate the new "ניהול אירוע (Dex)" event-day guide tab behind its own
-- permission resource, same pattern as couple_meeting (migration 026).
-- Only event managers and system admins get it by default.
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex'
  ));

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'event_management_dex', true, true
from roles r
where r.name in ('מנהל אירועים', 'מנהל מערכת')
on conflict (role_id, resource) do update set can_read = true, can_write = true;
