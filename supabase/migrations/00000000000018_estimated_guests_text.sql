-- The guest commitment is now a base count plus a computed max-reserve
-- addition (e.g. "200+14" for a 200 commitment with a 7% reserve), which
-- doesn't fit a plain integer - store it as free text instead.
alter table events alter column estimated_guests type text using estimated_guests::text;
