-- A short end-of-event summary for a private event: the final guest count
-- according to iPlan, the number of children, the time the party left the venue,
-- and free notes.
alter table private_events
  add column if not exists report_guests_iplan text,
  add column if not exists report_children_count text,
  add column if not exists report_exit_time time,
  add column if not exists report_notes text;
