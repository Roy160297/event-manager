-- Follow-up to 98: the reduced buffet under the gallery is not a step of its own
-- but the note on a "ריקודים" step, worded "פתיחת מזנון עיקריות מצומצם מתחת
-- לגלריה ל45 דק'". Reverse buffet weddings: drop the extra step from 98 and put
-- the new note back on their dancing step. Evening buffet wedding: the step right
-- after the chuppah becomes "ריקודים" carrying that note. Idempotent; also
-- works on a database where 98 was never applied.

delete from schedule_template_steps s
using schedule_templates t
where s.template_id = t.id
  and t.name in ($t$חתונה הפוכה ערב (מזנונים)$t$, $t$חתונה הפוכה שישי צהריים (מזנונים)$t$)
  and s.label = $t$צמצום מזנונים מתחת לגלריה$t$;

update schedule_template_steps s
set notes = $t$פתיחת מזנון עיקריות מצומצם מתחת לגלריה ל45 דק'$t$
from schedule_templates t
where s.template_id = t.id
  and t.name in ($t$חתונה הפוכה ערב (מזנונים)$t$, $t$חתונה הפוכה שישי צהריים (מזנונים)$t$)
  and s.label = $t$ריקודים$t$
  and (s.notes is null or s.notes like $t$%גלריה%$t$);

update schedule_template_steps s
set label = $t$ריקודים$t$,
    notes = $t$פתיחת מזנון עיקריות מצומצם מתחת לגלריה ל45 דק'$t$
from schedule_templates t
where s.template_id = t.id
  and t.name = $t$חתונת ערב (מזנונים)$t$
  and s.label in ($t$צמצום מזנונים מתחת לגלריה$t$, $t$מזנונים נפתחים (מנות עיקריות)$t$);
