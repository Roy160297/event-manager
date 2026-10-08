-- A staff member can have a separate address for receiving reminder emails
-- (e.g. a work address), while `email` stays the one they sign in with.
alter table staff add column if not exists notification_email text;
