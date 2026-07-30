-- Lets every checklist (event manager + floor manager + bar + barista) end
-- in an optional set of uploaded photos, shown on-page and in the PDF
-- export. Storage bucket/policies mirror the existing "event-sketches"
-- bucket (migration 007): this app has no auth/RLS on storage anywhere else
-- (single-tenant internal tool using the publishable key), so stay
-- consistent with that rather than inventing per-checklist storage RLS.
create table if not exists checklist_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  checklist_key text not null check (checklist_key in (
    'closing_checklist', 'floor_manager_checklist', 'bar_checklist', 'barista_checklist'
  )),
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table checklist_photos enable row level security;
create policy "checklist_photos select" on checklist_photos for select
  using (has_permission(checklist_key, 'read'));
create policy "checklist_photos insert" on checklist_photos for insert
  with check (has_permission(checklist_key, 'write'));
create policy "checklist_photos delete" on checklist_photos for delete
  using (has_permission(checklist_key, 'write'));

insert into storage.buckets (id, name, public)
values ('checklist-photos', 'checklist-photos', true)
on conflict (id) do nothing;

drop policy if exists "checklist-photos select" on storage.objects;
create policy "checklist-photos select"
  on storage.objects for select
  to public
  using (bucket_id = 'checklist-photos');

drop policy if exists "checklist-photos insert" on storage.objects;
create policy "checklist-photos insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'checklist-photos');

drop policy if exists "checklist-photos delete" on storage.objects;
create policy "checklist-photos delete"
  on storage.objects for delete
  to public
  using (bucket_id = 'checklist-photos');
