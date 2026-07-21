-- Extend the generic role_checklist_notes table (migration 024) to also
-- cover the original event-manager closing checklist, so every checklist
-- (not just the four role-specific ones) gets a free-text "הערות" note.
alter table role_checklist_notes drop constraint if exists role_checklist_notes_checklist_key_check;
alter table role_checklist_notes add constraint role_checklist_notes_checklist_key_check
  check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
  ));
