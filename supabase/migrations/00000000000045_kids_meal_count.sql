-- New "מספר מנות ילדים" rubric on the event overview (סקירה) tab.
alter table events add column if not exists kids_meal_count text;
