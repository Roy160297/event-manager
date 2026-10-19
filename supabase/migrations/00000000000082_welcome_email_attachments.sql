-- The guidelines PDFs attached to the welcome email used to live in the
-- repository's assets/ folder (one default plus one per event manager, chosen
-- by a hardcoded name list). They are now uploaded from the venue settings
-- screen: one default file (staff_id null) and, optionally, one file per staff
-- member who sends the email.
insert into storage.buckets (id, name, public)
values ('venue-files', 'venue-files', false)
on conflict (id) do nothing;
-- No storage policies on purpose: the files are read and written only by the
-- server (service role), after it has checked the venue_settings permission.

create table if not exists welcome_email_attachments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

-- At most one default (staff_id null) and one file per staff member.
create unique index if not exists welcome_email_attachments_one_per_staff
  on welcome_email_attachments ((coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid)));

alter table welcome_email_attachments enable row level security;

create policy "welcome_email_attachments select" on welcome_email_attachments for select
  using (is_staff_member());
create policy "welcome_email_attachments insert" on welcome_email_attachments for insert
  with check (has_permission('venue_settings', 'write'));
create policy "welcome_email_attachments update" on welcome_email_attachments for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "welcome_email_attachments delete" on welcome_email_attachments for delete
  using (has_permission('venue_settings', 'write'));
