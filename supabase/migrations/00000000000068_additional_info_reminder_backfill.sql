-- The new "additional-info-post-meeting" reminder fires once per event, the
-- first day it is due (a day after the couple meeting, or a week before the
-- event when no meeting date is set). Events whose due date has already
-- passed would otherwise all fire at once on the first cron run after this
-- ships; mark those as already handled so only events reaching the date from
-- now on send it.
insert into reminder_log (event_id, rule_key, sent_date)
select id, 'additional-info-post-meeting', current_date
from events
where deleted_at is null
  and coalesce(couple_meeting_date + 1, event_date - 7) <= current_date
on conflict do nothing;
