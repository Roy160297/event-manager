-- There is a single joker per event and they work the whole event.
update waiter_assignments set phase = 'event' where location_id is null and role = 'joker';
