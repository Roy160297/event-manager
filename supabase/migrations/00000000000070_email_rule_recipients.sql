-- Email reminders can now go to any of the recipients push reminders support:
-- the event's manager / floor manager / salesperson, everyone holding a role,
-- and specific staff members (plus free-typed addresses, as before).
alter table email_reminder_rules
  add column if not exists to_floor_manager boolean not null default false,
  add column if not exists recipient_role_ids uuid[] not null default '{}',
  add column if not exists recipient_staff_ids uuid[] not null default '{}';

-- The "only if the additional info was filled in" condition is gone: those
-- reminders always send, even with an empty additional-info field. (The one
-- supplier-based condition, on the DJ sketch reminder, stays: without it that
-- reminder would go out for every event.)
update email_reminder_rules set condition = 'none' where condition = 'additional_info_filled';
