-- Simplify manual event status: drop "planning" as a distinct stage (new
-- events start "approved" directly) and drop "canceled" as a manual choice
-- (canceling an event now means deleting it via the existing delete action).
-- Both values stay valid in the check constraint for any leftover historical
-- data, but the app no longer offers them and no longer inserts "planning".

update events set status = 'approved' where status = 'planning';

alter table events alter column status set default 'approved';
