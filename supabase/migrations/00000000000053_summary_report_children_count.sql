-- New "כמות ילדים" rubric on the post-event summary report.
alter table events add column if not exists final_children_count text;
