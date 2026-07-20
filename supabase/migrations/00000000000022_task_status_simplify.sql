-- Task status is now just open/done - "in_progress" added a distinction
-- nobody used in practice. Existing in_progress tasks fold back to open.
update tasks set status = 'open' where status = 'in_progress';
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (status in ('open', 'done'));
