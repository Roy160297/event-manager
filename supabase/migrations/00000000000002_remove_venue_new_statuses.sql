-- Drop venue (single hall, always "House No. Seven") and switch to the new
-- manually-set status set. "completed" is derived in the app once event_date
-- has passed, so it is intentionally not a storable status value here.

alter table events drop column if exists venue;

alter table events drop constraint if exists events_status_check;

update events set status = case status
  when 'upcoming' then 'planning'
  when 'in_progress' then 'approved'
  when 'completed' then 'approved'
  else 'planning'
end
where status not in ('planning', 'approved', 'canceled');

alter table events alter column status set default 'planning';

alter table events add constraint events_status_check
  check (status in ('planning', 'approved', 'canceled'));
