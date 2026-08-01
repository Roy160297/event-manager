-- Event summary report: security guard field becomes a count+hours pair
-- (matching hall/kitchen cleaner style) instead of a free-text note, and the
-- report gets its own independently-entered end time instead of always
-- reading the event's own end_time from the overview (סקירה) tab.
alter table events add column if not exists security_guard_count integer;
alter table events add column if not exists security_guard_hours text;
alter table events add column if not exists report_end_time time;
alter table events drop column if exists security_notes;
