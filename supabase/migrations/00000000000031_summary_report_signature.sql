-- Extends checklist_signatures to also cover the event summary report
-- ("דוח סיכום אירוע - מנהל אירוע"), which now needs its own sign-off gate
-- before the "send all by email" action is allowed, same as the 5 checklists.
alter table checklist_signatures drop constraint if exists checklist_signatures_checklist_key_check;
alter table checklist_signatures add constraint checklist_signatures_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist',
    'event_summary_report'
  ));
