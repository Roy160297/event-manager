-- The 4 role checklists (floor manager, bar, kitchen, barista) need a second
-- signature on top of the role holder's: after they fill in and sign, the
-- event manager reviews and co-signs the same checklist before it's fully
-- approved. Stored as extra columns on the same row rather than a second
-- table, since it's a 1:1 addition to an existing signature, not a separate
-- entity.
alter table checklist_signatures add column if not exists manager_signed_at timestamptz;
alter table checklist_signatures add column if not exists manager_signed_by_name text;
alter table checklist_signatures add column if not exists manager_signature_data text;

-- Co-signing/un-cosigning updates the manager_* columns on an existing row
-- (the role holder's own signature stays untouched) - restricted to whoever
-- can write the general event-manager checklist, not the role's own
-- permission (a bar staff member shouldn't be able to co-sign as manager).
create policy "checklist_signatures update" on checklist_signatures for update
  using (has_permission('closing_checklist', 'write'))
  with check (has_permission('closing_checklist', 'write'));
