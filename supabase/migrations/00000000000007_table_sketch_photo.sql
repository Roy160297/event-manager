-- Lets the staffing page store a reference photo/PDF of the table-sketch
-- floor plan so the waiters' manager can see it while assigning waiters.
alter table events add column if not exists table_sketch_path text;

insert into storage.buckets (id, name, public)
values ('event-sketches', 'event-sketches', true)
on conflict (id) do nothing;

-- App has no auth/RLS anywhere else (single-tenant internal tool using the
-- publishable key for everything), so mirror that here: open to any client.
drop policy if exists "event-sketches select" on storage.objects;
create policy "event-sketches select"
  on storage.objects for select
  to public
  using (bucket_id = 'event-sketches');

drop policy if exists "event-sketches insert" on storage.objects;
create policy "event-sketches insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'event-sketches');

drop policy if exists "event-sketches update" on storage.objects;
create policy "event-sketches update"
  on storage.objects for update
  to public
  using (bucket_id = 'event-sketches');

drop policy if exists "event-sketches delete" on storage.objects;
create policy "event-sketches delete"
  on storage.objects for delete
  to public
  using (bucket_id = 'event-sketches');
