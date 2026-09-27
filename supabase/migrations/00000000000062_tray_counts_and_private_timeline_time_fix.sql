alter table events add column if not exists initial_tray_count text;
alter table events add column if not exists final_tray_count text;

-- private_event_timeline_items.approx_time was accidentally created as a
-- Postgres `time` column (00000000000060_private_events.sql), unlike the
-- venue's own timeline_items.approx_time which is `text` - this made the
-- REST API return "18:30:00" instead of "18:30". Switch it to text, using
-- the existing time value's HH:MM formatting so already-seeded rows keep
-- their times without gaining seconds in the process.
alter table private_event_timeline_items
  alter column approx_time type text using to_char(approx_time, 'HH24:MI');
