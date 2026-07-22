-- Supabase Advisor flagged closing_checklist_checks as "RLS disabled, but
-- policies exist" - the table's RLS got turned back off after migration 011
-- re-enabled it (migration 009 predates auth and disabled it; something
-- re-ran that after policies were already in place). All the policies from
-- migrations 011/013 are still correct and attached - this just restores
-- enforcement.
alter table closing_checklist_checks enable row level security;
