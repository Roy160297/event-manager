-- The "staff select" policy added in 00000000000011 queries `staff` from
-- within its own USING clause ("exists (select 1 from staff me where ...)"),
-- which Postgres RLS re-evaluates recursively against the same policy -
-- causing "infinite recursion detected in policy for relation staff" on
-- every single read, for every user. Replace it with a SECURITY DEFINER
-- function (same pattern as has_permission()) that checks staff membership
-- without re-triggering RLS.
create or replace function is_staff_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

drop policy if exists "staff select" on staff;
create policy "staff select" on staff for select using (is_staff_member());
