-- The joker works only after the reception, i.e. in the hall phase.
update waiter_assignments set phase = 'hall' where location_id is null and role = 'joker';
