-- Venue-wide settings that were hardcoded for "House No. Seven" (name, calendar
-- name, who receives the closing-checklist email, the welcome-email text), now
-- editable in the app by whoever holds the new venue_settings permission. One
-- row only (id is always true).
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks', 'menu', 'calendar',
    'business_event_checklist', 'push_reminder_rules', 'venue_settings'
  ));

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'venue_settings', true, true
from roles r
where r.name in ('מנהל מערכת', 'בעלים', 'מנהל אירועים')
on conflict (role_id, resource) do nothing;

create table if not exists venue_settings (
  id boolean primary key default true check (id),
  venue_name text not null default '',
  calendar_name text not null default '',
  checklist_email_to text[] not null default '{}',
  checklist_email_cc text[] not null default '{}',
  welcome_email_subject text not null default '',
  -- {{manager_name}} and {{signature}} are filled in per event when the email is drafted.
  welcome_email_body text not null default '',
  welcome_email_attachment_filename text not null default ''
);
alter table venue_settings enable row level security;

create policy "venue_settings select" on venue_settings for select using (is_staff_member());
create policy "venue_settings insert" on venue_settings for insert
  with check (has_permission('venue_settings', 'write'));
create policy "venue_settings update" on venue_settings for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));

insert into venue_settings (
  id, venue_name, calendar_name, checklist_email_to, checklist_email_cc,
  welcome_email_subject, welcome_email_body, welcome_email_attachment_filename
) values (
  true, 'House No. Seven', 'אירועי שבע',
  array['rankuperman@gmail.com', 'roy1602@gmail.com', 'Yaron@house7.co.il', 'Asaf@sheva.co.il', 'chef@house7.co.il', 'Liran@house7.co.il', 'snir@house7.co.il', 'nir.chadad1994@gmail.com']::text[],
  array['info@house7.co.il', 'omer@house7.co.il', 'eva.b@house7.co.il']::text[],
  'דף הנחיות לפגישה ראשונית - House No. Seven',
  $body$אהלן זוג יקר
נעים מאוד, {{manager_name}} 😊
איזה כיף שהגענו לחלק הזה 🥳

לנוחיותכם להמשך הדרך, רשימת בעלי התפקידים באירוע שלכם:

אנוכי - מנהל האירוע שלכם מטעם האולם. אני אלווה אתכם מעתה ועד לסוף האירוע, כולל וכמובן בזמן האירוע עצמו.
מלצרית משפחה - תהיה לשירותכם לאורך האירוע
שניר - מנהל תפעול יום והקמת האירוע
דותן - שף האולם
צוות קייטרינג לפי יחס של 1:10
מנהל מלצרים מטעם הקייטרינג
צוות בר לפי יחס של 1:50 כולל מנהל בר

בנוסף - מצורף מטה דף הנחיות עליו עברנו יחד בפגישה.

בבקשה להשיב במייל חוזר (אם לא סיפקתם לי את המידע הזה בפגישה או אחריה) שמות וטלפונים של הספקים, כגון:
דיג'י
צלמים: סטילס וידאו מגנטים
רב / מנחה טקס
מעצב/ת
ועוד...

זמין בשבילכם לכל דבר ומתי שצריך,
{{signature}}$body$,
  'הנחיות והכנות לאירוע - חתונה בשבע.pdf'
) on conflict (id) do nothing;
