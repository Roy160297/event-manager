-- The "tasks after the couple meeting" reminder used to go out only if the
-- meeting date was exactly yesterday. It now catches up: when a meeting date
-- is entered (or changed) after the day following the meeting has passed, and
-- the event hasn't happened yet, the reminder is sent once, right then.
update email_reminder_rules set match_mode = 'on_or_after' where rule_key = 'post-meeting-followup-tasks';

-- Upcoming events whose meeting was already well in the past would all fire at
-- once on the next check; mark those as handled so only meeting dates entered
-- from now on trigger it.
insert into reminder_log (event_id, rule_key, sent_date)
select id, 'post-meeting-followup-tasks', current_date
from events
where deleted_at is null
  and event_type <> 'business_event'
  and event_date >= current_date
  and couple_meeting_date is not null
  and couple_meeting_date + 1 < current_date
on conflict do nothing;
