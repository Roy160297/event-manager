-- Reverts the can_be_floor_manager role-gating added in migration 036: the
-- "מנהל/ת פלור" dropdown now just reuses the same eligible-staff pool as
-- "מנהל/ת אירוע אחראי/ת" (can_be_event_manager), so no separate flag/toggle
-- is needed. events.floor_manager_id itself is unaffected and stays.
alter table roles drop column if exists can_be_floor_manager;
