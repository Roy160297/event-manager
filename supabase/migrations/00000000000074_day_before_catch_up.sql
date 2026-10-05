-- The two "day before the event" reminders (tasks for the day before, and the
-- meal breakdown for the kitchen) now also go out if the event is created or
-- edited after that day has passed (e.g. an event added on the day itself),
-- as long as the event hasn't happened yet. Their text no longer says the event
-- is "tomorrow", since it may be sent later than that.
update email_reminder_rules
set match_mode = 'on_or_after',
    body = replace(body, '), המתקיים מחר -', ') -')
where rule_key in ('day-before-event-tasks', 'kitchen-meal-breakdown');
