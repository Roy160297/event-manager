-- Allow the event summary report to also use the checklist_photos feature
-- (migration 041) - same RLS pattern, gated by the existing
-- event_summary_report permission resource, no policy changes needed.
alter table checklist_photos drop constraint if exists checklist_photos_checklist_key_check;
alter table checklist_photos add constraint checklist_photos_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'event_summary_report'
  ));
