-- The six default run-of-show templates (evening/Friday wedding, buffet/served,
-- reverse) used to be constants in the source code. They now live in tables the
-- venue edits from the app (/admin/schedules): which event type and weekday each
-- template is applied to automatically when an event is created, and its steps.
-- The current contents are loaded below unchanged.

create table if not exists schedule_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Event types this template is filled in automatically for when an event is
  -- created; empty means it is only ever applied by hand from the timeline tab.
  event_types text[] not null default '{}',
  -- Which weekday the automatic choice applies to: any day, only Friday, or any day but Friday.
  day_kind text not null default 'any' check (day_kind in ('any', 'friday', 'not_friday')),
  -- When set, the steps are shifted so this time lines up with the event's own
  -- start time (the Friday templates are written for a noon reception).
  reference_time text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists schedule_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references schedule_templates(id) on delete cascade,
  label text not null,
  step_time text not null,
  notes text
);

alter table schedule_templates enable row level security;
alter table schedule_template_steps enable row level security;

create policy "schedule_templates select" on schedule_templates for select using (is_staff_member());
create policy "schedule_templates insert" on schedule_templates for insert with check (has_permission('venue_settings', 'write'));
create policy "schedule_templates update" on schedule_templates for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "schedule_templates delete" on schedule_templates for delete using (has_permission('venue_settings', 'write'));

create policy "schedule_template_steps select" on schedule_template_steps for select using (is_staff_member());
create policy "schedule_template_steps insert" on schedule_template_steps for insert with check (has_permission('venue_settings', 'write'));
create policy "schedule_template_steps update" on schedule_template_steps for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "schedule_template_steps delete" on schedule_template_steps for delete using (has_permission('venue_settings', 'write'));

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונת ערב (מזנונים)$t$, array['wedding']::text[], 'any', null, 10
where not exists (select 1 from schedule_templates where name = $t$חתונת ערב (מזנונים)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '18:30', null),
  ($t$הבאת אוכל לזוג$t$, '18:45', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '19:00', null),
  ($t$קבלת פנים$t$, '19:30', null),
  ($t$כתובה$t$, '20:15', null),
  ($t$מזנונים נסגרים, הכנות לחופה והדרכה$t$, '20:45', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '21:00', null),
  ($t$מזנונים נפתחים (מנות עיקריות)$t$, '21:20', $t$15-20 דקות ריקודים$t$),
  ($t$מנות עיקריות$t$, '21:50', $t$הכלה מחליפה ללוק שני$t$),
  ($t$ריקודים$t$, '22:20', null),
  ($t$קינוחים$t$, '22:50', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '23:50', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונת ערב (מזנונים)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונת ערב (הגשה)$t$, array['wedding_service']::text[], 'any', null, 20
where not exists (select 1 from schedule_templates where name = $t$חתונת ערב (הגשה)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '18:30', null),
  ($t$הבאת אוכל לזוג$t$, '18:45', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '19:00', null),
  ($t$קבלת פנים$t$, '19:30', null),
  ($t$כתובה$t$, '20:15', null),
  ($t$הכנות לחופה והדרכה$t$, '20:45', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '21:00', null),
  ($t$ראשונות$t$, '21:20', null),
  ($t$ריקודים$t$, '21:35', null),
  ($t$עיקריות$t$, '22:00', $t$הכלה מחליפה ללוק שני$t$),
  ($t$ריקודים$t$, '22:30', null),
  ($t$קינוחים$t$, '22:45', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '23:45', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונת ערב (הגשה)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונה הפוכה ערב (מזנונים)$t$, array['reverse_wedding']::text[], 'not_friday', null, 30
where not exists (select 1 from schedule_templates where name = $t$חתונה הפוכה ערב (מזנונים)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '18:30', null),
  ($t$הבאת אוכל לזוג$t$, '18:45', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '19:00', null),
  ($t$קבלת פנים$t$, '19:30', null),
  ($t$פתיחת דלתות ומזנונים ראשיים$t$, '19:50', null),
  ($t$כתובה$t$, '20:15', null),
  ($t$סגירת מזנוני חצר$t$, '21:05', null),
  ($t$סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה$t$, '21:20', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '21:30', null),
  ($t$ריקודים$t$, '21:50', $t$פתיחת מזנון עיקריות מצומצם לכ45 דק' (מתחת לגלריה)$t$),
  ($t$קינוחים$t$, '22:30', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '23:30', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונה הפוכה ערב (מזנונים)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונה הפוכה שישי צהריים (מזנונים)$t$, array['reverse_wedding']::text[], 'friday', '12:00', 40
where not exists (select 1 from schedule_templates where name = $t$חתונה הפוכה שישי צהריים (מזנונים)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '11:00', null),
  ($t$הבאת אוכל לזוג$t$, '11:15', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '11:30', null),
  ($t$קבלת פנים$t$, '12:00', null),
  ($t$פתיחת דלתות ומזנונים ראשיים$t$, '12:20', null),
  ($t$כתובה$t$, '12:45', null),
  ($t$סגירת מזנוני חצר$t$, '13:35', null),
  ($t$סגירת מזנונים ראשיים, הוצאת אורחים לחצר והכנה לחופה והדרכה$t$, '13:50', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '14:00', null),
  ($t$ריקודים$t$, '14:20', $t$פתיחת מזנון עיקריות מצומצם לכ45 דק' (מתחת לגלריה)$t$),
  ($t$קינוחים$t$, '15:00', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '16:00', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונה הפוכה שישי צהריים (מזנונים)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונה הפוכה ערב (הגשה)$t$, array['reverse_wedding_service']::text[], 'not_friday', null, 50
where not exists (select 1 from schedule_templates where name = $t$חתונה הפוכה ערב (הגשה)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '18:30', null),
  ($t$הבאת אוכל לזוג$t$, '18:45', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '19:00', null),
  ($t$קבלת פנים$t$, '19:30', null),
  ($t$פתיחת דלתות, ראשונות על השולחן$t$, '19:50', null),
  ($t$כתובה$t$, '20:15', null),
  ($t$הגשת עיקריות$t$, '20:20', null),
  ($t$סיום הגשת עיקריות, הוצאת אורחים לחצר והכנה לחופה והדרכה$t$, '21:15', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '21:30', null),
  ($t$ריקודים$t$, '21:50', $t$הכלה מחליפה ללוק שני$t$),
  ($t$קינוחים$t$, '22:30', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '23:30', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונה הפוכה ערב (הגשה)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);

insert into schedule_templates (name, event_types, day_kind, reference_time, sort_order)
select $t$חתונה הפוכה שישי צהריים (הגשה)$t$, array['reverse_wedding_service']::text[], 'friday', '12:00', 60
where not exists (select 1 from schedule_templates where name = $t$חתונה הפוכה שישי צהריים (הגשה)$t$);

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, v.label, v.step_time, v.notes
from schedule_templates t
cross join (values
  ($t$החתן והכלה מגיעים לאולם$t$, '11:00', null),
  ($t$הבאת אוכל לזוג$t$, '11:15', $t$אחריות מלצרית משפחה$t$),
  ($t$צילומי משפחות$t$, '11:30', null),
  ($t$קבלת פנים$t$, '12:00', null),
  ($t$פתיחת דלתות, ראשונות על השולחן$t$, '12:20', null),
  ($t$כתובה$t$, '12:45', null),
  ($t$הגשת עיקריות$t$, '12:50', null),
  ($t$סיום הגשת עיקריות, הוצאת אורחים לחצר והכנה לחופה והדרכה$t$, '13:45', $t$יצירת שביל חופה$t$),
  ($t$חופה$t$, '14:00', null),
  ($t$ריקודים$t$, '14:20', $t$הכלה מחליפה ללוק שני$t$),
  ($t$קינוחים$t$, '15:00', $t$קיפול מזנונים$t$),
  ($t$אפטר$t$, '16:00', $t$קיפול הקינוחים$t$)
) as v(label, step_time, notes)
where t.name = $t$חתונה הפוכה שישי צהריים (הגשה)$t$
and not exists (select 1 from schedule_template_steps s where s.template_id = t.id);
