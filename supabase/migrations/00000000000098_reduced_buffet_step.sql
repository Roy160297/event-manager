-- The reduced main-course buffet under the gallery (about 45 minutes) is now a
-- step of its own in the buffet run-of-shows, not a note inside "ריקודים".
-- Reverse buffet weddings (evening + Friday): move the note out of the dancing
-- step into its own step at the same time. Evening buffet wedding: the step
-- right after the chuppah becomes the reduced buffet. Idempotent.

update schedule_template_steps s
set notes = null
from schedule_templates t
where s.template_id = t.id
  and t.name in ($t$חתונה הפוכה ערב (מזנונים)$t$, $t$חתונה הפוכה שישי צהריים (מזנונים)$t$)
  and s.label = $t$ריקודים$t$
  and s.notes = $t$פתיחת מזנון עיקריות מצומצם לכ45 דק' (מתחת לגלריה)$t$;

insert into schedule_template_steps (template_id, label, step_time, notes)
select t.id, $t$צמצום מזנונים מתחת לגלריה$t$, v.step_time, $t$פתיחת מזנון עיקריות מצומצם לכ45 דק'$t$
from schedule_templates t
join (values
  ($t$חתונה הפוכה ערב (מזנונים)$t$, '21:50'),
  ($t$חתונה הפוכה שישי צהריים (מזנונים)$t$, '14:20')
) as v(name, step_time) on v.name = t.name
where not exists (
  select 1 from schedule_template_steps s
  where s.template_id = t.id and s.label = $t$צמצום מזנונים מתחת לגלריה$t$
);

update schedule_template_steps s
set label = $t$צמצום מזנונים מתחת לגלריה$t$,
    notes = $t$פתיחת מזנון עיקריות מצומצם לכ45 דק'. 15-20 דקות ריקודים$t$
from schedule_templates t
where s.template_id = t.id
  and t.name = $t$חתונת ערב (מזנונים)$t$
  and s.label = $t$מזנונים נפתחים (מנות עיקריות)$t$;
