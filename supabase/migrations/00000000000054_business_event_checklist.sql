-- A genuinely separate closing checklist for business events (אירוע עסקי),
-- covering production/vendor departure coordination - its own resource, own
-- signature/notes/checked-items rows (checklist_key), rendered the same way
-- as the floor manager/bar/barista checklists (not folded into the main
-- event-manager closing checklist as a category). The app only shows/adds it
-- for events whose type is business_event (see lib/roleChecklists.ts).
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks', 'menu', 'calendar',
    'business_event_checklist'
  ));

-- Seeded with the same read/write matrix every role already has on
-- 'closing_checklist' - the same people who manage the main event-manager
-- checklist manage this one, with no separate admin step required.
insert into role_permissions (role_id, resource, can_read, can_write)
select role_id, 'business_event_checklist', can_read, can_write
from role_permissions
where resource = 'closing_checklist'
on conflict (role_id, resource) do update set can_read = excluded.can_read, can_write = excluded.can_write;

alter table role_checklist_checks drop constraint if exists role_checklist_checks_checklist_key_check;
alter table role_checklist_checks add constraint role_checklist_checks_checklist_key_check
  check (checklist_key in (
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist', 'business_event_checklist'
  ));

alter table role_checklist_notes drop constraint if exists role_checklist_notes_checklist_key_check;
alter table role_checklist_notes add constraint role_checklist_notes_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'business_event_checklist'
  ));

alter table checklist_signatures drop constraint if exists checklist_signatures_checklist_key_check;
alter table checklist_signatures add constraint checklist_signatures_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'event_summary_report', 'business_event_checklist'
  ));
