-- Add the "איש מכירות" role so staff can be assigned it and show up in the
-- salesperson dropdown (lib/staff.ts getSalespersonCandidates matches on
-- this exact role name). Named without the "/ת" slash to match every other
-- role in this system (e.g. "מנהל פלור", not "מנהל/ת פלור") - the UI label
-- on the dropdown itself stays gender-neutral ("איש/ת מכירות").
insert into roles (name) values ('איש מכירות') on conflict (name) do nothing;

-- Same default (no permissions) every new role gets when created via the
-- admin UI's createRole action - editable afterwards via the Roles &
-- Permissions grid.
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, false, false
from roles r, unnest(array[
  'events', 'tasks', 'timeline', 'guests', 'staffing',
  'closing_checklist', 'event_summary_report', 'floor_manager_checklist',
  'bar_checklist', 'barista_checklist', 'couple_meeting',
  'event_management_dex', 'waiters', 'admin', 'my_tasks'
]) as res
where r.name = 'איש מכירות'
on conflict (role_id, resource) do nothing;
