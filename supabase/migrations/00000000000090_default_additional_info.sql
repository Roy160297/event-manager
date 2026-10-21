-- The starting text of the "additional info" box on a wedding (the couple-meeting
-- questions) was fixed in the source; it is now a venue setting.
alter table venue_settings add column if not exists default_additional_info text not null default '';

update venue_settings
set default_additional_info = $t$סדר כניסה לחופה:
בר מרובע? איזה סוג חבילת בר?
עיצוב?
אפטר?$t$
where default_additional_info = '';
