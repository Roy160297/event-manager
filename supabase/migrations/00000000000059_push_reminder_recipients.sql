-- Not every push reminder should go to the event's manager - e.g. a bar-
-- related reminder should go to whoever's in the bar role, not the office.
-- Lets each rule pick its own recipient instead of always defaulting to
-- event_manager.
alter table push_reminder_rules
  add column if not exists recipient_type text not null default 'event_manager'
    check (recipient_type in ('event_manager', 'floor_manager', 'role', 'fixed_staff')),
  add column if not exists recipient_role_id uuid references roles(id) on delete set null,
  add column if not exists recipient_staff_id uuid references staff(id) on delete set null;
