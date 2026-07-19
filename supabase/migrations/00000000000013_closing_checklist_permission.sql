-- Split "tasks" write access into a separate 'closing_checklist' permission:
-- a role that can edit tasks (e.g. Floor Manager) should not automatically
-- be able to check/uncheck the closing checklist - only roles explicitly
-- granted this new resource can. Checklist visibility (select) stays tied to
-- 'tasks' read as before; only mutating it now requires the new resource.

alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in ('events', 'guests', 'tasks', 'closing_checklist', 'timeline', 'staffing', 'waiters', 'admin'));

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'closing_checklist', true, true
from roles r
where r.name = 'מנהל מערכת'
on conflict (role_id, resource) do nothing;

drop policy if exists "closing_checklist_checks insert" on closing_checklist_checks;
drop policy if exists "closing_checklist_checks update" on closing_checklist_checks;
drop policy if exists "closing_checklist_checks delete" on closing_checklist_checks;

create policy "closing_checklist_checks insert" on closing_checklist_checks for insert
  with check (has_permission('closing_checklist', 'write'));
create policy "closing_checklist_checks update" on closing_checklist_checks for update
  using (has_permission('closing_checklist', 'write')) with check (has_permission('closing_checklist', 'write'));
create policy "closing_checklist_checks delete" on closing_checklist_checks for delete
  using (has_permission('closing_checklist', 'write'));
