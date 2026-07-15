-- Responsible-person records only need a name now; email/phone are no longer collected.
alter table staff alter column email drop not null;
