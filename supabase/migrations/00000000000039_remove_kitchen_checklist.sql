-- Remove the kitchen closing checklist entirely: it duplicated ground the
-- general closing checklist already covers (kitchen scan/lights/etc, see
-- migration 040), so the venue stopped using it as a separate signed sheet.
-- Data must be deleted before tightening the check constraints below, since
-- adding a constraint validates all existing rows.
delete from role_checklist_checks where checklist_key = 'kitchen_checklist';
delete from role_checklist_notes where checklist_key = 'kitchen_checklist';
delete from checklist_signatures where checklist_key = 'kitchen_checklist';
delete from role_permissions where resource = 'kitchen_checklist';

alter table role_checklist_checks drop constraint if exists role_checklist_checks_checklist_key_check;
alter table role_checklist_checks add constraint role_checklist_checks_checklist_key_check
  check (checklist_key in (
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist'
  ));

alter table role_checklist_notes drop constraint if exists role_checklist_notes_checklist_key_check;
alter table role_checklist_notes add constraint role_checklist_notes_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist'
  ));

alter table checklist_signatures drop constraint if exists checklist_signatures_checklist_key_check;
alter table checklist_signatures add constraint checklist_signatures_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'event_summary_report'
  ));

alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks'
  ));
