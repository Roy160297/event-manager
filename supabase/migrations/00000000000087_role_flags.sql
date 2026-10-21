-- The floor-manager and salesperson dropdowns used to find people by the exact
-- NAME of their role ("מנהל פלור", "איש מכירות"), so renaming a role silently
-- emptied the list. Like can_be_event_manager, they are now flags on the role.
alter table roles add column if not exists can_be_floor_manager boolean not null default false;
alter table roles add column if not exists can_be_salesperson boolean not null default false;

-- Keep today's behaviour: the roles that matched by name get the flag.
update roles set can_be_floor_manager = true where name = 'מנהל פלור';
update roles set can_be_salesperson = true where name = 'איש מכירות';
