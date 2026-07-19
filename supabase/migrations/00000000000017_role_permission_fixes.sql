-- Two independent fixes surfaced by testing:
--
-- 1. The "מנהל אירועים" role should always be eligible as an event manager
--    (that's what the role name means) - its can_be_event_manager checkbox
--    was intentionally hidden in the UI (app/admin/roles/page.tsx), but
--    hiding the checkbox never actually set the underlying flag, so the
--    role was silently excluded from the event overview's manager dropdown.
update roles set can_be_event_manager = true where name = 'מנהל אירועים';

-- 2. setRolePermission() used a plain UPDATE (now fixed to upsert in
--    app/admin/roles/actions.ts), so toggling a checkbox for a resource that
--    had no existing role_permissions row silently did nothing - this hit
--    every role other than "מנהל מערכת" for the closing_checklist and
--    event_summary_report resources, since those were only backfilled for
--    the admin role in migration 00000000000015. Backfill missing rows for
--    every existing role/resource pair so the grid has a consistent
--    baseline row to read/write, matching what createRole() does for new
--    roles.
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, false, false
from roles r, unnest(array['events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report', 'timeline', 'staffing', 'waiters', 'admin']) as res
on conflict (role_id, resource) do nothing;
