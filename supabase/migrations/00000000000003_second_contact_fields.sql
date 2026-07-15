-- Add a second email/phone slot for event contacts.

alter table events add column if not exists contact_email_2 text;
alter table events add column if not exists contact_phone_2 text;
