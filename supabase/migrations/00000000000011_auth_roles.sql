-- Adds Google SSO + a role-based permission system:
--   - `roles` / `role_permissions`: named roles with per-resource read/write flags.
--   - `staff.user_id` / `staff.role_id`: links a pre-listed staff row to its
--     Supabase Auth user once they sign in, and assigns their role.
--   - `has_permission()`: the single check every RLS policy below defers to.
--   - `link_staff_account()`: called right after OAuth login (before the
--     caller has a role, so before normal RLS would let them read anything)
--     to link `auth.uid()` to the staff row matching their email, or report
--     that no such row exists so the app can sign them back out.
-- This replaces the "open to any client" posture from earlier migrations
-- (00000000000000, 00000000000007) now that the app has real auth.

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  resource text not null check (resource in ('events', 'guests', 'tasks', 'timeline', 'staffing', 'waiters', 'admin')),
  can_read boolean not null default false,
  can_write boolean not null default false,
  primary key (role_id, resource)
);

alter table staff add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table staff add column if not exists role_id uuid references roles(id) on delete set null;

-- Seed one full-access role so there's something to assign once the first
-- admin links their account (see README for the one-time bootstrap step).
insert into roles (name) values ('מנהל מערכת') on conflict (name) do nothing;
insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, res, true, true
from roles r, unnest(array['events', 'guests', 'tasks', 'timeline', 'staffing', 'waiters', 'admin']) as res
where r.name = 'מנהל מערכת'
on conflict (role_id, resource) do nothing;

-- Central permission check: true if the currently authenticated user is
-- linked to a staff row whose role grants `p_action` on `p_resource`.
-- SECURITY DEFINER + owned by the table owner so it can read `staff` and
-- `role_permissions` regardless of the caller's own RLS visibility into them.
create or replace function has_permission(p_resource text, p_action text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select case p_action
        when 'read' then rp.can_read
        when 'write' then rp.can_write
        else false
      end
      from staff s
      join role_permissions rp on rp.role_id = s.role_id
      where s.user_id = auth.uid()
        and rp.resource = p_resource
    ),
    false
  );
$$;

-- Links auth.uid() to the staff row matching the signed-in user's email.
-- Returns linked=false when no such staff row exists (the app must sign the
-- user back out in that case) and has_role=false when they're recognized
-- but no admin has assigned them a role yet.
create or replace function link_staff_account()
returns table (linked boolean, has_role boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_staff_id uuid;
  v_role_id uuid;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return query select false, false;
    return;
  end if;

  select id, role_id into v_staff_id, v_role_id from staff where lower(email) = lower(v_email);
  if v_staff_id is null then
    return query select false, false;
    return;
  end if;

  update staff set user_id = auth.uid() where id = v_staff_id and (user_id is null or user_id = auth.uid());

  return query select true, (v_role_id is not null);
end;
$$;

grant execute on function link_staff_account() to authenticated;

-- roles / role_permissions: admin-only.
alter table roles enable row level security;
create policy "roles select" on roles for select using (has_permission('admin', 'read'));
create policy "roles insert" on roles for insert with check (has_permission('admin', 'write'));
create policy "roles update" on roles for update using (has_permission('admin', 'write')) with check (has_permission('admin', 'write'));
create policy "roles delete" on roles for delete using (has_permission('admin', 'write'));

alter table role_permissions enable row level security;
create policy "role_permissions select" on role_permissions for select using (has_permission('admin', 'read'));
create policy "role_permissions insert" on role_permissions for insert with check (has_permission('admin', 'write'));
create policy "role_permissions update" on role_permissions for update using (has_permission('admin', 'write')) with check (has_permission('admin', 'write'));
create policy "role_permissions delete" on role_permissions for delete using (has_permission('admin', 'write'));

-- staff: any recognized staff member can read the roster (needed for manager/
-- assignee pickers); only admin-write can add, edit, or remove staff / roles.
alter table staff enable row level security;
create policy "staff select" on staff for select
  using (exists (select 1 from staff me where me.user_id = auth.uid()));
create policy "staff insert" on staff for insert with check (has_permission('admin', 'write'));
create policy "staff update" on staff for update using (has_permission('admin', 'write')) with check (has_permission('admin', 'write'));
create policy "staff delete" on staff for delete using (has_permission('admin', 'write'));

-- events / event_suppliers
alter table events enable row level security;
create policy "events select" on events for select using (has_permission('events', 'read'));
create policy "events insert" on events for insert with check (has_permission('events', 'write'));
create policy "events update" on events for update using (has_permission('events', 'write')) with check (has_permission('events', 'write'));
create policy "events delete" on events for delete using (has_permission('events', 'write'));

alter table event_suppliers enable row level security;
create policy "event_suppliers select" on event_suppliers for select using (has_permission('events', 'read'));
create policy "event_suppliers insert" on event_suppliers for insert with check (has_permission('events', 'write'));
create policy "event_suppliers update" on event_suppliers for update using (has_permission('events', 'write')) with check (has_permission('events', 'write'));
create policy "event_suppliers delete" on event_suppliers for delete using (has_permission('events', 'write'));

-- tasks
alter table tasks enable row level security;
create policy "tasks select" on tasks for select using (has_permission('tasks', 'read'));
create policy "tasks insert" on tasks for insert with check (has_permission('tasks', 'write'));
create policy "tasks update" on tasks for update using (has_permission('tasks', 'write')) with check (has_permission('tasks', 'write'));
create policy "tasks delete" on tasks for delete using (has_permission('tasks', 'write'));

-- timeline_items
alter table timeline_items enable row level security;
create policy "timeline_items select" on timeline_items for select using (has_permission('timeline', 'read'));
create policy "timeline_items insert" on timeline_items for insert with check (has_permission('timeline', 'write'));
create policy "timeline_items update" on timeline_items for update using (has_permission('timeline', 'write')) with check (has_permission('timeline', 'write'));
create policy "timeline_items delete" on timeline_items for delete using (has_permission('timeline', 'write'));

-- closing_checklist_checks (Tasks tab): migration 00000000000009 disabled RLS
-- here entirely (open to any client with the anon key) before this app had
-- auth; bring it under the same 'tasks' permission as the rest of the tab.
alter table closing_checklist_checks enable row level security;
create policy "closing_checklist_checks select" on closing_checklist_checks for select using (has_permission('tasks', 'read'));
create policy "closing_checklist_checks insert" on closing_checklist_checks for insert with check (has_permission('tasks', 'write'));
create policy "closing_checklist_checks update" on closing_checklist_checks for update using (has_permission('tasks', 'write')) with check (has_permission('tasks', 'write'));
create policy "closing_checklist_checks delete" on closing_checklist_checks for delete using (has_permission('tasks', 'write'));

-- guests
alter table guests enable row level security;
create policy "guests select" on guests for select using (has_permission('guests', 'read'));
create policy "guests insert" on guests for insert with check (has_permission('guests', 'write'));
create policy "guests update" on guests for update using (has_permission('guests', 'write')) with check (has_permission('guests', 'write'));
create policy "guests delete" on guests for delete using (has_permission('guests', 'write'));

-- waiters (reusable roster)
alter table waiters enable row level security;
create policy "waiters select" on waiters for select using (has_permission('waiters', 'read'));
create policy "waiters insert" on waiters for insert with check (has_permission('waiters', 'write'));
create policy "waiters update" on waiters for update using (has_permission('waiters', 'write')) with check (has_permission('waiters', 'write'));
create policy "waiters delete" on waiters for delete using (has_permission('waiters', 'write'));

-- locations / waiter_assignments (staffing tab)
alter table locations enable row level security;
create policy "locations select" on locations for select using (has_permission('staffing', 'read'));
create policy "locations insert" on locations for insert with check (has_permission('staffing', 'write'));
create policy "locations update" on locations for update using (has_permission('staffing', 'write')) with check (has_permission('staffing', 'write'));
create policy "locations delete" on locations for delete using (has_permission('staffing', 'write'));

alter table waiter_assignments enable row level security;
create policy "waiter_assignments select" on waiter_assignments for select using (has_permission('staffing', 'read'));
create policy "waiter_assignments insert" on waiter_assignments for insert with check (has_permission('staffing', 'write'));
create policy "waiter_assignments update" on waiter_assignments for update using (has_permission('staffing', 'write')) with check (has_permission('staffing', 'write'));
create policy "waiter_assignments delete" on waiter_assignments for delete using (has_permission('staffing', 'write'));

-- notification_log: no app UI reads/writes this yet; lock it down to admin.
alter table notification_log enable row level security;
create policy "notification_log select" on notification_log for select using (has_permission('admin', 'read'));
create policy "notification_log all" on notification_log for all using (has_permission('admin', 'write')) with check (has_permission('admin', 'write'));

-- event-sketches storage: switch from a public bucket (unauthenticated read)
-- to RLS-gated access under the 'staffing' resource. The app now reads
-- sketches via signed URLs instead of the public URL.
update storage.buckets set public = false where id = 'event-sketches';

drop policy if exists "event-sketches select" on storage.objects;
create policy "event-sketches select" on storage.objects for select
  using (bucket_id = 'event-sketches' and has_permission('staffing', 'read'));

drop policy if exists "event-sketches insert" on storage.objects;
create policy "event-sketches insert" on storage.objects for insert
  with check (bucket_id = 'event-sketches' and has_permission('staffing', 'write'));

drop policy if exists "event-sketches update" on storage.objects;
create policy "event-sketches update" on storage.objects for update
  using (bucket_id = 'event-sketches' and has_permission('staffing', 'write'));

drop policy if exists "event-sketches delete" on storage.objects;
create policy "event-sketches delete" on storage.objects for delete
  using (bucket_id = 'event-sketches' and has_permission('staffing', 'write'));
