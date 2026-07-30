-- Removed from the event summary report per request; the photographer's
-- name/phone is already covered by the general suppliers list on the
-- overview page.
alter table events drop column if exists photographer_contact;
