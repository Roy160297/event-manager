-- The calendar (יומן) page was never gated behind a permission resource -
-- it shows every event's name/type/manager/salesperson/guest count
-- venue-wide with no way for an admin to restrict it, unlike every other
-- page in the app. Add it as its own resource, same pattern as every prior
-- resource addition, seeded with the same read/write matrix every role
-- already has on 'events' (viewing the calendar is the same kind of
-- visibility as browsing the events list).
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks', 'menu', 'calendar'
  ));

insert into role_permissions (role_id, resource, can_read, can_write)
select role_id, 'calendar', can_read, can_write
from role_permissions
where resource = 'events'
on conflict (role_id, resource) do update set can_read = excluded.can_read, can_write = excluded.can_write;
