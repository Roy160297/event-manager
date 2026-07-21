-- Free-text note per (event, role checklist) - used for the barista
-- checklist's "רשימת חוסרים" (deficiency list) field, which is a plain note
-- rather than a checkable item. Generic over checklist_key like
-- role_checklist_checks, in case another checklist wants one later.
create table if not exists role_checklist_notes (
  event_id uuid not null references events(id) on delete cascade,
  checklist_key text not null check (checklist_key in (
    'floor_manager_checklist', 'bar_checklist', 'kitchen_checklist', 'barista_checklist'
  )),
  note text,
  updated_at timestamptz not null default now(),
  primary key (event_id, checklist_key)
);

alter table role_checklist_notes enable row level security;
create policy "role_checklist_notes select" on role_checklist_notes for select
  using (has_permission(checklist_key, 'read'));
create policy "role_checklist_notes insert" on role_checklist_notes for insert
  with check (has_permission(checklist_key, 'write'));
create policy "role_checklist_notes update" on role_checklist_notes for update
  using (has_permission(checklist_key, 'write')) with check (has_permission(checklist_key, 'write'));
