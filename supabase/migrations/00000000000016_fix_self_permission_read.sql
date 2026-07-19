-- getCurrentStaff() reads `roles` and `role_permissions` directly (not
-- through the security-definer has_permission() function), so those two
-- tables' own RLS policies apply to the call. Both were select-gated on
-- admin:read only, meaning a non-admin's own permission lookup was silently
-- blocked by RLS - they'd appear to have zero permissions everywhere no
-- matter what the Roles & Permissions grid actually granted them.
--
-- `roles` also needs to be broadly readable (not just self/admin): the event
-- overview page's manager dropdown filters staff by every role's
-- can_be_event_manager flag, for any user who can read events, not just
-- admins. Role names/flags aren't sensitive - open it up the same way
-- `staff` itself is open to any staff member.
--
-- `role_permissions` (the actual grant matrix) stays tighter: admins, or a
-- user reading their own role's rows (needed for getCurrentStaff itself).

drop policy if exists "roles select" on roles;
create policy "roles select" on roles for select
  using (exists (select 1 from staff me where me.user_id = auth.uid()));

drop policy if exists "role_permissions select" on role_permissions;
create policy "role_permissions select" on role_permissions for select
  using (
    has_permission('admin', 'read')
    or role_id = (select role_id from staff where user_id = auth.uid())
  );
