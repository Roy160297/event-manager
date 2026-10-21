-- The "DJ Tzach Ziv" special case (an automatic sketch-update task and a matching
-- email reminder tied to one supplier's name) was specific to one venue's
-- circumstances and is removed. Tasks it already created stay as ordinary tasks.
delete from email_reminder_rules where condition = 'supplier_dj_tzach_ziv';

alter table email_reminder_rules drop constraint if exists email_reminder_rules_condition_check;
alter table email_reminder_rules add constraint email_reminder_rules_condition_check
  check (condition in ('none', 'additional_info_filled'));
