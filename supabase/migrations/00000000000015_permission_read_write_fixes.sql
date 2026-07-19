-- Several fixes to the read/write permission model:
--   1. "write implies read" at the DB level: has_permission(resource,'read')
--      now also succeeds when the role has write, so a write-only role isn't
--      left with a broken half-state (can mutate but can't see anything back).
--   2. closing_checklist_checks select decoupled from 'tasks' read (was a
--      stopgap from migration 13) and tied to its own 'closing_checklist'
--      resource, now that it's a fully independent, renamed permission.
--   3. new 'event_summary_report' resource, split off from 'events' write
--      (enforced at the app layer inside updateEventSummaryReport - Postgres
--      RLS is row-level, not column-level, and the summary report fields
--      live on the same events row as core event fields).
--   4. roles.can_be_event_manager: which roles are eligible to be assigned
--      as an event's responsible manager, distinct from any resource
--      read/write permission.

create or replace function has_permission(p_resource text, p_action text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select case p_action
        when 'read' then (rp.can_read or rp.can_write)
        when 'write' then rp.can_write
        else false
      end
      from staff s
      join role_permissions rp on rp.role_id = s.role_id
      where s.user_id = auth.uid()
        and rp.resource = p_resource
    ),
    false
  );
$$;

alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin'
  ));

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, true, true
from roles r, unnest(array['closing_checklist', 'event_summary_report']) as res
where r.name = 'מנהל מערכת'
on conflict (role_id, resource) do update set can_read = true, can_write = true;

drop policy if exists "closing_checklist_checks select" on closing_checklist_checks;
create policy "closing_checklist_checks select" on closing_checklist_checks for select
  using (has_permission('closing_checklist', 'read'));

alter table roles add column if not exists can_be_event_manager boolean not null default false;
update roles set can_be_event_manager = true where name = 'מנהל מערכת';
