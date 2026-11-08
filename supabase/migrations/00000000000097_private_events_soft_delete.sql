-- Deleting a private event now moves it to a recycling bin instead of
-- destroying it at once (same as the venue's events, see migration 19), so an
-- accidental delete is recoverable.
alter table private_events add column if not exists deleted_at timestamptz;
