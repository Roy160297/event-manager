-- Migration 013 split closing_checklist_checks write access into its own
-- 'closing_checklist' permission (insert/update/delete), but left the select
-- policy from migration 011 tied to the broader 'tasks' read permission.
-- That's inconsistent with the app's own gating (the Tasks page only renders
-- the "Closing Checklist - Event Manager" section when the viewer has
-- 'closing_checklist' read specifically) and means anyone with 'tasks' read
-- could still fetch these rows directly, bypassing the intended visibility
-- boundary. Align select with the same resource as write.
drop policy if exists "closing_checklist_checks select" on closing_checklist_checks;
create policy "closing_checklist_checks select" on closing_checklist_checks for select
  using (has_permission('closing_checklist', 'read'));
