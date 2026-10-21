-- The private-events section belongs to one person, identified by e-mail. That
-- e-mail used to be written into this function; it now comes from
-- app_settings ('private_events_owner_email'), which only the server (service
-- role) and this security-definer function can read - venue admins cannot see or
-- change it. With no such row nobody owns the section, so it is simply off:
-- a new venue's deployment has no row, while the existing one has it set by hand.
create or replace function is_private_events_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where staff.user_id = auth.uid()
      and lower(staff.email) = (select lower(value) from app_settings where key = 'private_events_owner_email')
  );
$$;
