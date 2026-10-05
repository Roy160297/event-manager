-- Push reminders get the same recipient picking as email reminders: any mix of
-- the event's manager / floor manager / salesperson and specific staff
-- members. The old single recipient_type / recipient_role_id / recipient_staff_id
-- columns stay (unused by the form) so rules that targeted a whole role keep
-- working through recipient_role_ids.
alter table push_reminder_rules
  add column if not exists to_event_manager boolean not null default false,
  add column if not exists to_floor_manager boolean not null default false,
  add column if not exists to_salesperson boolean not null default false,
  add column if not exists recipient_role_ids uuid[] not null default '{}',
  add column if not exists recipient_staff_ids uuid[] not null default '{}';

update push_reminder_rules set
  to_event_manager = (recipient_type = 'event_manager'),
  to_floor_manager = (recipient_type = 'floor_manager'),
  recipient_role_ids = case when recipient_type = 'role' and recipient_role_id is not null
                            then array[recipient_role_id] else '{}' end,
  recipient_staff_ids = case when recipient_type = 'fixed_staff' and recipient_staff_id is not null
                             then array[recipient_staff_id] else '{}' end;
