-- Deleting an event now moves it to a recycling bin instead of destroying
-- it immediately, so an accidental (or reconsidered) delete is recoverable.
alter table events add column if not exists deleted_at timestamptz;
