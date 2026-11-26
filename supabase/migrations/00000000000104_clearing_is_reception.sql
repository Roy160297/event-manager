-- Clearing (פינויים) belongs to the reception phase.
update waiter_assignments set phase = 'reception' where location_id is null and role = 'clearing';
