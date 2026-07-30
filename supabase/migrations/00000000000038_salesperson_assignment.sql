-- Add a "איש/ת מכירות" staff-assignment field to events, same pattern as
-- floor_manager_id: a dropdown of staff whose assigned role is named
-- "איש/ת מכירות". The existing free-text sales_person_name column stays
-- untouched (still used by the PDF/image import auto-fill flows, which
-- extract a name from a document with no way to match it to a staff row).
alter table events add column if not exists sales_person_id uuid references staff(id) on delete set null;
create index if not exists idx_events_sales_person on events(sales_person_id);
