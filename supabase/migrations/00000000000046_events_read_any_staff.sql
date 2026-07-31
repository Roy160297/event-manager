-- Any authenticated staff member (regardless of role/permissions) can now
-- browse the events list and open an individual event - this is what lets a
-- role like Bar Manager reach the Tasks tab and see their own checklist. The
-- 'events' resource permission still gates the overview (סקירה) tab's own
-- read/edit UI and all events INSERT/UPDATE/DELETE, same as before; only the
-- base SELECT is opened up here.
drop policy if exists "events select" on events;
create policy "events select" on events for select
  using (exists (select 1 from staff s where s.user_id = auth.uid()));
