-- Persists a formal sign-off per (event, checklist) - previously a signature
-- was only ever drawn ad-hoc right before a single PDF download and thrown
-- away afterward. Signing now locks the checklist (enforced in the app, not
-- here) and gates the "send all checklists by email" action, which requires
-- all five to be signed first.
create table if not exists checklist_signatures (
  event_id uuid not null references events(id) on delete cascade,
  checklist_key text not null check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
  )),
  signed_at timestamptz not null default now(),
  signed_by_name text not null,
  signature_data text not null,
  primary key (event_id, checklist_key)
);

alter table checklist_signatures enable row level security;

create policy "checklist_signatures select" on checklist_signatures for select
  using (has_permission(checklist_key, 'read'));

create policy "checklist_signatures insert" on checklist_signatures for insert
  with check (has_permission(checklist_key, 'write'));

-- No update policy - re-signing after a mistake means unsigning (delete) then
-- signing again, rather than mutating a signature that was already relied on.
create policy "checklist_signatures delete" on checklist_signatures for delete
  using (has_permission(checklist_key, 'write'));
