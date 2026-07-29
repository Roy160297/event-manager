-- Add a "מנהל/ת פלור" staff-assignment field to events, mirroring the
-- existing manager_id ("מנהל/ת אירוע אחראי/ת") pattern: a dropdown of staff
-- eligible for the role, gated by a per-role boolean flag on roles.
-- This is distinct from the existing free-text floor_manager_name column
-- (migration 010), which is filled in after the event as part of the
-- Event Summary Report and isn't tied to the staff table.
alter table roles add column if not exists can_be_floor_manager boolean not null default false;

alter table events add column if not exists floor_manager_id uuid references staff(id) on delete set null;
create index if not exists idx_events_floor_manager on events(floor_manager_id);
