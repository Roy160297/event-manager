-- Whether this venue uses iPlan at all. When off, everything built around iPlan
-- screens (creating or updating an event from an iPlan screenshot or PDF, the
-- iPlan links, the sketch label, the sync tab) is hidden. A new venue starts with
-- it off; the venue that already used it keeps it on.
alter table venue_settings add column if not exists iplan_enabled boolean not null default false;
update venue_settings set iplan_enabled = true;
