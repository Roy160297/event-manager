-- Give מנהל אירועים and מנהל מערכת read access to all four remaining
-- checklists (event manager, floor manager, bar, barista) - previously only
-- מנהל מערכת had it on floor/bar/barista, and neither role had it on
-- closing_checklist's own resource row for the other. Read-only: does not
-- touch can_write, so this doesn't grant editing rights on checklists that
-- belong to a different role.
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, true, false
from roles r, unnest(array[
  'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist'
]) as res
where r.name in ('מנהל אירועים', 'מנהל מערכת')
on conflict (role_id, resource) do update set can_read = true;
