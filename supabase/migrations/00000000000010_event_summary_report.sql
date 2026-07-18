-- Post-event summary report ("דוח סיכום אירוע" task report from the venue's
-- Sheva/Dex World app), filled in by the event manager after closing.
-- Fields already tracked elsewhere on events (date, couple names, event
-- type, start/end time, guest commitment, manager) are reused rather than
-- duplicated here - only genuinely new fields get their own column.
alter table events add column if not exists production_company text;
alter table events add column if not exists exit_time time;
alter table events add column if not exists final_guest_count_counter integer;
alter table events add column if not exists final_guest_count_iplan text;
alter table events add column if not exists reserve_opened_count integer;
alter table events add column if not exists bar_manager_name text;
alter table events add column if not exists bartender_count text;
alter table events add column if not exists floor_manager_name text;
alter table events add column if not exists waiter_count integer;
alter table events add column if not exists cook_count integer;
alter table events add column if not exists kitchen_dishwasher_count integer;
alter table events add column if not exists dishwasher_count integer;
alter table events add column if not exists security_notes text;
alter table events add column if not exists report_summary text;
alter table events add column if not exists report_general_notes text;
alter table events add column if not exists hall_cleaner_hours text;
alter table events add column if not exists restroom_cleaner_hours text;
alter table events add column if not exists kitchen_dishwasher_hours text;
alter table events add column if not exists dishwasher_hours text;
alter table events add column if not exists photographer_contact text;
