-- Convert the event summary report's numeric "quantity" fields to free text
-- (staff want to write things like "3-4" or "2 (one left early)", not just a
-- bare integer), and add a free-text field for the number of chairs seated
-- per the uploaded table sketch.
alter table events alter column final_guest_count_counter type text using final_guest_count_counter::text;
alter table events alter column reserve_opened_count type text using reserve_opened_count::text;
alter table events alter column waiter_count type text using waiter_count::text;
alter table events alter column cook_count type text using cook_count::text;
alter table events alter column kitchen_dishwasher_count type text using kitchen_dishwasher_count::text;
alter table events alter column dishwasher_count type text using dishwasher_count::text;
alter table events alter column security_guard_count type text using security_guard_count::text;

alter table events add column if not exists sketch_seated_chairs_count text;
