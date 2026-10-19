-- Optional venue logo (a path inside the private venue-files bucket). When it is
-- empty the header and login page show the venue name as text, as before.
alter table venue_settings add column if not exists logo_path text;
