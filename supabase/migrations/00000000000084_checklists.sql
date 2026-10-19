-- The closing checklists (event manager, floor manager, bar, barista, business
-- event) used to be fixed lists in the source code, and the database only allowed
-- those five keys. They now live in tables the venue edits from the app
-- (/admin/checklists), so a checklist can be added, renamed or reshaped without a
-- developer. The current contents are loaded below unchanged, with the same keys,
-- so every existing check mark, note, signature and photo still matches.

-- 1. Any checklist key is allowed from now on (validated in the app instead).
alter table checklist_photos drop constraint if exists checklist_photos_checklist_key_check;
alter table checklist_signatures drop constraint if exists checklist_signatures_checklist_key_check;
alter table role_checklist_checks drop constraint if exists role_checklist_checks_checklist_key_check;
alter table role_checklist_notes drop constraint if exists role_checklist_notes_checklist_key_check;
-- Each checklist is also a permission resource (what a role may see or sign).
alter table role_permissions drop constraint if exists role_permissions_resource_check;

-- 2. Definitions.
create table if not exists checklists (
  key text primary key,
  label text not null,
  -- Label of the free-text box under the list; null means the checklist has none.
  note_label text,
  -- Event types the checklist applies to; null means every type.
  event_types text[],
  show_category_labels boolean not null default false,
  -- Sent by email together with the event summary report.
  include_in_email boolean not null default false,
  -- The event manager co-signs after the role holder signs.
  requires_manager_cosign boolean not null default false,
  -- The event manager's own checklist: has its own storage and cannot be deleted.
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists checklist_categories (
  id uuid primary key default gen_random_uuid(),
  checklist_key text not null references checklists(key) on delete cascade,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  unique (checklist_key, key)
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references checklist_categories(id) on delete cascade,
  -- Denormalised so an item key is unique within its checklist (check marks are stored by it).
  checklist_key text not null references checklists(key) on delete cascade,
  key text not null,
  text text not null,
  sort_order integer not null default 0,
  unique (checklist_key, key)
);

alter table checklists enable row level security;
alter table checklist_categories enable row level security;
alter table checklist_items enable row level security;

create policy "checklists select" on checklists for select using (is_staff_member());
create policy "checklists insert" on checklists for insert with check (has_permission('venue_settings', 'write'));
create policy "checklists update" on checklists for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "checklists delete" on checklists for delete using (has_permission('venue_settings', 'write'));

create policy "checklist_categories select" on checklist_categories for select using (is_staff_member());
create policy "checklist_categories insert" on checklist_categories for insert with check (has_permission('venue_settings', 'write'));
create policy "checklist_categories update" on checklist_categories for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "checklist_categories delete" on checklist_categories for delete using (has_permission('venue_settings', 'write'));

create policy "checklist_items select" on checklist_items for select using (is_staff_member());
create policy "checklist_items insert" on checklist_items for insert with check (has_permission('venue_settings', 'write'));
create policy "checklist_items update" on checklist_items for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "checklist_items delete" on checklist_items for delete using (has_permission('venue_settings', 'write'));

-- 3. Current contents.

insert into checklists (key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order)
values ('closing_checklist', $t$צ'קליסט סגירה - מנהל אירוע$t$, $t$הערות$t$, null, true, true, false, true, 20)
on conflict (key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('closing_checklist', $t$yard$t$, $t$חצר + חזיתות$t$, 10)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$yard-reception-cleanup$t$, $t$ניקיון עמדות קבלת פנים: החלק העליון + בטן המזנון + השארת ציוד קבוע בבטן המזנון. הזזת המזנונים לטובת טאטוא.$t$, 10),
  ($t$yard-reception-trash-pile$t$, $t$פינוי של פחים עמדות קבלת הפנים לשטיפה.$t$, 20),
  ($t$yard-ice-fridge-area$t$, $t$לוודא שאזור מקרר הקרח בעמדת הפינויים נקי ומסודר (כולל חיפוש מפיות, מגשים וציוד מאחורי המקרר).$t$, 30),
  ($t$yard-sofa-cushions$t$, $t$החזרת כריות ספות האירוח פנימה.$t$, 40),
  ($t$yard-tables-cover$t$, $t$כיסוי שולחנות חצר.$t$, 50),
  ($t$yard-buffets-cover$t$, $t$כיסוי מזנונים חיצוניים.$t$, 60),
  ($t$yard-sweep$t$, $t$ניקוי חצר: מטאטא יסודי, ניקוי שולחנות וספות.$t$, 70),
  ($t$yard-chuppah-decoration-removal$t$, $t$הסרת עיצוב מהחופה.$t$, 80),
  ($t$yard-chuppah-cleanup$t$, $t$ניקוי איזור חופה (לאחר הסרת עיצוב).$t$, 90),
  ($t$yard-hostess-station$t$, $t$ניקיון עמדת מארחת + בטן העמדה + להכניס כיסאות, צ'ילר ועמדות חבלול, ולהכניס אותה בסיום האירוע פנימה.$t$, 100),
  ($t$yard-tablecloths-sorting$t$, $t$לוודא שכל המפות והמפיות (לבנות/שמנת/שחורות) נכנסות לשקיות כתומות בסמוך לכניסה לאולם.$t$, 110),
  ($t$yard-glasses-cigarettes$t$, $t$פינוי כוסות וסיגריות מהיקף החצר, וכל העציצים והאדניות בחצר ובתוך האולם.$t$, 120),
  ($t$yard-ashtrays$t$, $t$לנקות מאפרות אפורות (שטיפה במטבח).$t$, 130),
  ($t$yard-sidewalk-scan$t$, $t$סריקה של המדרכה בצידי האולם, איסוף חפצים שנשארו בחוץ (כוסות וכלים).$t$, 140),
  ($t$yard-trash-bins$t$, $t$לוודא שפחי האשפה סגורים ואין דליפה על הרצפה.$t$, 150),
  ($t$yard-return-bins$t$, $t$החזרת פחי הפינויים למקומם ולוודא שלמשאית יש גישה נוחה לפחים.$t$, 160)
) as v(key, text, sort_order)
where c.checklist_key = 'closing_checklist' and c.key = $t$yard$t$
on conflict (checklist_key, key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('closing_checklist', $t$hall$t$, $t$אולם$t$, 20)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$hall-buffet-cleaning$t$, $t$ניקיון כל עמדות המזנונים באולם: החלק העליון + בטן המזנון + השארת ציוד קבוע בבטן המזנון. הזזת המזנונים לטובת טאטוא.$t$, 10),
  ($t$hall-after-equipment$t$, $t$כלי הגשה וציוד האפטר - מנוקה ומוחזר לארגז ציוד.$t$, 20),
  ($t$hall-barista-disposal-check$t$, $t$בדיקת פינויים ליד הבריסטה (בכניסה למטבח) והחזרת באסקטים של הבריסטה לשטיפה.$t$, 30),
  ($t$hall-tables-cleaning$t$, $t$ניקיון שולחנות עם סקוץ' וסבון ומים (לא להרטיב את הפלטת העץ) - מנהל צריך לפקח שלא שמים הרבה סבון.$t$, 40),
  ($t$hall-chairs-cleaning$t$, $t$ניקיון כסאות משאריות אוכל ופירורים, ולאחר מכן לערום אותם.$t$, 50),
  ($t$hall-gallery$t$, $t$מעבר על הגלריה (ניקוי שולחנות, כסאות, גרם מדרגות ווידוא שרצפת המזנון בגלריה נקייה ומסודרת).$t$, 60),
  ($t$hall-ice-cream-fridge$t$, $t$לוודא שמקרר הגלידה מחובר לחשמל.$t$, 70),
  ($t$hall-waiters-cabinet-and-room$t$, $t$לוודא סדר בחדר המלצרים.$t$, 80),
  ($t$hall-shirts-sorting$t$, $t$חולצות שחורות מלוכלכות בכניסה לחדר בשקית כתומה; חולצות נקיות חוזרות לקולב.$t$, 90),
  ($t$hall-aprons-sorting$t$, $t$סינרים שחורים (סינרי חצי וסינרי מזנונים) - ספורים ומחולקים לשתי שקיות כתומות: נקי / מלוכלך, עם פתק מספר הפריטים בכל שקית.$t$, 100),
  ($t$hall-radios$t$, $t$החזרת מכשירי הקשר לארון בחדר מלצרים כבויים, ולוודא שהם טעונים כראוי (אור אדום).$t$, 110),
  ($t$hall-dj-stations$t$, $t$מעבר על פינוי וניקיון בשתי עמדות הדיג'יי.$t$, 120),
  ($t$hall-bride-groom-room$t$, $t$מעבר על פינוי וניקיון בחדר החתן והכלה.$t$, 130),
  ($t$hall-tools-gathered$t$, $t$ריכוז מגבים, מטאטאים ויעים במסודר בסיום הפירוק.$t$, 140),
  ($t$hall-full-scan$t$, $t$סריקת מטבחים כוללת: שוטף כלים שביצע את כל משימותיו.$t$, 150),
  ($t$hall-inner-kitchen-area-cleanup$t$, $t$ניקיון וסידור השטח מחוץ למטבח הפנימי.$t$, 160),
  ($t$hall-fridges-no-food$t$, $t$לוודא שאין אוכל במקררים.$t$, 170),
  ($t$hall-ice-machine-closed$t$, $t$לוודא שמכונת הקרח בחדר המלצרים סגורה.$t$, 180),
  ($t$hall-trays-count$t$, $t$ספירת מגשים.$t$, 190),
  ($t$hall-doors-handprints$t$, $t$ניקוי דלתות אולם מסימני כפות ידיים.$t$, 200),
  ($t$hall-speakers-armchairs$t$, $t$ניקוי רמקולים וכורסאות.$t$, 210)
) as v(key, text, sort_order)
where c.checklist_key = 'closing_checklist' and c.key = $t$hall$t$
on conflict (checklist_key, key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('closing_checklist', $t$offices$t$, $t$משרדים$t$, 30)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$office-ac-off$t$, $t$לכבות אורות (שני מתגים) ומזגנים.$t$, 10),
  ($t$office-hostess-equipment$t$, $t$לוודא שהדברים מעמדת המארחות חזרו: 2 אייפדים (מוטענים), 2 קאונטרים, 2 מטענים.$t$, 20),
  ($t$office-photo-summary$t$, $t$צילום הקאונטרים ועמוד "הצטרפות אורחים".$t$, 30)
) as v(key, text, sort_order)
where c.checklist_key = 'closing_checklist' and c.key = $t$offices$t$
on conflict (checklist_key, key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('closing_checklist', $t$electrical$t$, $t$מערכות חשמליות$t$, 40)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$electrical-hall-power$t$, $t$כיבוי החשמל באולם (ארון חשמל מעל המטבח וארון חשמל במטבח החיצוני).$t$, 10),
  ($t$electrical-inner-cabinet-switch-off$t$, $t$כיבוי אור של ארון חשמל פנימי.$t$, 20),
  ($t$electrical-hall-ac$t$, $t$כיבוי מזגנים באולם (ליד עמדת מגנטים ובכניסה למטבח).$t$, 30),
  ($t$electrical-hall-hood$t$, $t$כיבוי מנדף אולם.$t$, 40),
  ($t$electrical-warming-cabinets$t$, $t$לוודא שארונות החימום כבויים ונקיים.$t$, 50),
  ($t$electrical-kitchen-hood$t$, $t$כיבוי מנדף מטבח יצרן.$t$, 60),
  ($t$electrical-yard-fans$t$, $t$כיבוי מאווררים וצ'ילרים באולם ובחצר.$t$, 70),
  ($t$electrical-outer-kitchen-lights-both-floors$t$, $t$כיבוי אורות במטבח החיצוני (שתי הקומות).$t$, 80),
  ($t$electrical-restroom-light$t$, $t$כיבוי תאורת השביל והשירותים.$t$, 90),
  ($t$electrical-breaker-check$t$, $t$לוודא שלא ירדו המפסקים שצריך (בלוח החשמל).$t$, 100)
) as v(key, text, sort_order)
where c.checklist_key = 'closing_checklist' and c.key = $t$electrical$t$
on conflict (checklist_key, key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('closing_checklist', $t$locks$t$, $t$נעילות + אזעקה$t$, 50)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$lock-tips-safe$t$, $t$העברת מעטפות הטיפים (מלצרים ומטבח) לכספת של לירן.$t$, 10),
  ($t$lock-black-bag-envelopes$t$, $t$איסוף שקית שחורה מהבר / מהמאבטח המיועדת למעטפות לכספת - האיסוף מתבצע יחד עם מאבטח ואחד מבני הזוג.$t$, 20),
  ($t$lock-liran-office$t$, $t$נעילת משרד לירן (מפתח: אדום קטן, צרור במגירה השנייה).$t$, 30),
  ($t$lock-offices$t$, $t$נעילת דלת הכניסה למשרדים (מפתח: שחור עגול קטן).$t$, 40),
  ($t$lock-office-kitchenette$t$, $t$נעילת דלת מטבח המשרדים (מפתח: צהוב משולש).$t$, 50),
  ($t$lock-cafe-door$t$, $t$נעילת דלת המטבחון/קפיטריה (מפתח: צהוב עגול).$t$, 60),
  ($t$lock-main-gate$t$, $t$נעילת שער הכניסה לאולם (מפתח: שחור עגול).$t$, 70),
  ($t$lock-briefing-door$t$, $t$נעילת דלת הבריף (מנעול עליון ותחתון).$t$, 80),
  ($t$lock-magnet-door$t$, $t$נעילת דלת המגנטים (מנעול עליון ותחתון).$t$, 90),
  ($t$lock-waiters-room-inner-door$t$, $t$נעילת הדלת הפנימית בחדר המלצרים (מפתח: תכלת עגול).$t$, 100),
  ($t$lock-emergency-exit$t$, $t$נעילת דלת היציאה לפחים (מפתח: כחול RB).$t$, 110),
  ($t$lock-inner-kitchen-door$t$, $t$נעילת דלת המטבח הפנימי (מפתח: שחור מרובע).$t$, 120),
  ($t$lock-outside-white-metal-door$t$, $t$נעילת דלת יציאה לרחוב (ליד משרד השף) (מפתח: כחול RB).$t$, 130),
  ($t$lock-hall-kitchen-disposal-door$t$, $t$נעילת דלת היציאה לרחוב ממטבח הפינויים באולם (מפתח: שחור עגול 64P).$t$, 140),
  ($t$lock-alarm-activation$t$, $t$הפעלת אזעקה בסיום האירוע.$t$, 150)
) as v(key, text, sort_order)
where c.checklist_key = 'closing_checklist' and c.key = $t$locks$t$
on conflict (checklist_key, key) do nothing;

insert into checklists (key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order)
values ('business_event_checklist', $t$צ'קליסט סגירה - אירוע עסקי$t$, $t$הערות$t$, array['business_event']::text[], false, false, true, false, 10)
on conflict (key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('business_event_checklist', $t$business-event-vendors$t$, $t$ספקי הפקה$t$, 10)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$biz-production-vendor-departure-timing$t$, $t$ווידוא עם ההפקה שכלל הספקים יודעים מתי להגיע בסיום האירוע: במה, הגברה ותאורה, עיצוב, מיתוג וכו'.$t$, 10),
  ($t$biz-production-rep-stays-until-done$t$, $t$הישארות נציג הפקה עד סיום עבודת הספקים.$t$, 20),
  ($t$biz-vendor-tasks-review-before-leaving$t$, $t$מעבר עם כל ספק על ביצוע כלל משימותיו טרם עזיבתו (כולל פינוי זבל).$t$, 30),
  ($t$biz-yard-morning-items$t$, $t$השארת פריטים לבוקר מרוכז בחצר.$t$, 40)
) as v(key, text, sort_order)
where c.checklist_key = 'business_event_checklist' and c.key = $t$business-event-vendors$t$
on conflict (checklist_key, key) do nothing;

insert into checklists (key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order)
values ('floor_manager_checklist', $t$צ'קליסט סגירה - מנהל פלור$t$, $t$הערות$t$, null, false, false, true, false, 30)
on conflict (key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('floor_manager_checklist', $t$floor-manager$t$, $t$צ'קליסט סגירה - מנהל פלור$t$, 10)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$fm-reception-cleanup$t$, $t$ניקיון עמדות קבלת פנים: חלק עליון + בטן המזנון. נשאר במזנון: סטנדים, כלי הגשה כבדים (משטח אבן וקרמיקה מוגבהת). כבלים מאריכים מקופלים בפנים.$t$, 10),
  ($t$fm-vegetables-fridge$t$, $t$לוודא שכל הירקות נאספו והוחזרו למקרר הירקות בקומה העליונה במטבח.$t$, 20),
  ($t$fm-bread-utensils$t$, $t$כלי הלחם נאספים מהשולחנות ומסודרים במקומם נקיים אחרי שטיפה.$t$, 30),
  ($t$fm-serving-equipment$t$, $t$כלי הגשה (מלקחיים, כפות הגשה, מלח-פלפל) וכלי חימום עוברים ניקיון ומסודרים במקומות הייעודיים.$t$, 40),
  ($t$fm-table-numbers$t$, $t$מספרי השולחנות בארגז שלהם.$t$, 50),
  ($t$fm-gallery$t$, $t$מעבר על הגלריה (ניקוי שולחנות, לטאטא רצפה, ולוודא שמזנון הגלריה נקי ומסודר). - כמה שניתן לסדר עד לסגירה$t$, 60),
  ($t$fm-waiters-room$t$, $t$לוודא סדר וניקיון בחדר המלצרים - שיהיה כמה שיותר מוכן לסגירה.$t$, 70),
  ($t$fm-chuppah-cleanup$t$, $t$ניקיון שולחן חופה ושברי זכוכית ולכלוך מהרצפה.$t$, 80),
  ($t$fm-office-kitchen-dishes$t$, $t$פינוי כלים ממטבח המשרדים + ניקיון הכיור.$t$, 90),
  ($t$fm-trays-count-before-exit$t$, $t$ריכוז מגשים מכל האולם על מקרר הקרח.$t$, 100)
) as v(key, text, sort_order)
where c.checklist_key = 'floor_manager_checklist' and c.key = $t$floor-manager$t$
on conflict (checklist_key, key) do nothing;

insert into checklists (key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order)
values ('bar_checklist', $t$צ'קליסט סגירה - בר$t$, $t$הערות$t$, null, false, false, true, false, 40)
on conflict (key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('bar_checklist', $t$bar$t$, $t$צ'קליסט סגירה - בר$t$, 10)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$bar-sweep-mop$t$, $t$ניקוי מטאטא ומגב בעמדה בה היה הבר במהלך האירוע (כולל בר חוץ).$t$, 10),
  ($t$bar-rubber-surfaces$t$, $t$ניגוב עם סמרטוט את משטחי הגומי בברים.$t$, 20),
  ($t$bar-outer-cleaning$t$, $t$ניקיון הבר מהחלק החיצוני (מים, סבון וסמרטוט).$t$, 30),
  ($t$bar-trash$t$, $t$פינוי כל הזבל.$t$, 40),
  ($t$bar-adjacent-surfaces$t$, $t$ניקיון משטחי העמודים שצמודים לבר.$t$, 50),
  ($t$bar-consolidate$t$, $t$ריכוז הברים במקום המיועד לכך + ריכוז שאר חתיכות הבר בצידי האולם.$t$, 60),
  ($t$bar-kitchen-drinks-check$t$, $t$בדיקה במטבח באזור המשקאות שאין בארון בקבוקים וקרטונים.$t$, 70),
  ($t$bar-cabinets-locked$t$, $t$סריקה שכל הארונות נעולים.$t$, 80),
  ($t$bar-disposal-scan$t$, $t$סריקה בכניסה למטבח החיצוני שאין קרטונים\באסקטים ודברים שקשורים לבר.$t$, 90),
  ($t$bar-cocktail-station-storage$t$, $t$סידור עמדת הקוקטיילים בארונות של הבר (לא מתחת לבריסטה).$t$, 100),
  ($t$bar-prep-next-event$t$, $t$הכנת הבר לאירוע הבא על פי הנהלים.$t$, 110),
  ($t$bar-cover-outer$t$, $t$לכסות בר חיצוני.$t$, 120),
  ($t$bar-glasses-removal$t$, $t$פינוי כל הכוסות מהברים במידה ואין אירוע עד 3 ימים אחרי.$t$, 130)
) as v(key, text, sort_order)
where c.checklist_key = 'bar_checklist' and c.key = $t$bar$t$
on conflict (checklist_key, key) do nothing;

insert into checklists (key, label, note_label, event_types, show_category_labels, include_in_email, requires_manager_cosign, is_system, sort_order)
values ('barista_checklist', $t$צ'קליסט סגירה - בריסטה$t$, $t$רשימת חוסרים$t$, null, false, false, true, false, 50)
on conflict (key) do nothing;

insert into checklist_categories (checklist_key, key, label, sort_order)
values ('barista_checklist', $t$barista$t$, $t$צ'קליסט סגירה - בריסטה$t$, 10)
on conflict (checklist_key, key) do nothing;

insert into checklist_items (category_id, checklist_key, key, text, sort_order)
select c.id, c.checklist_key, v.key, v.text, v.sort_order
from checklist_categories c
cross join (values
  ($t$barista-cabinet-cleaning$t$, $t$הוצאת כלי הקפה והמוצרים מהארון ומהקירור, וניקיון הארון והמדפים עם סבון, מים חמים וסקוץ'.$t$, 10),
  ($t$barista-double-cabinet$t$, $t$סידור הארון הכפול שמתחת לעמדת הקפה וניקוי ארון הקפה.$t$, 20),
  ($t$barista-machine-grinder$t$, $t$ניקיון המכונה מלמעלה (כולל ספירת ניירות) והמטחנה.$t$, 30),
  ($t$barista-floor-sweep$t$, $t$טיאטוא רצפת אזור עמדת הקפה.$t$, 40),
  ($t$barista-wall-cabinets$t$, $t$ניקיון הקיר מאחורי עמדת הקפה, כולל הארונות.$t$, 50),
  ($t$barista-dirty-dishes$t$, $t$איסוף כל הכלים המלוכלכים בשטח העמדה (כוסות, תחתיות, כפיות) והעברתם לפיילה בצורה מסודרת.$t$, 60),
  ($t$barista-clean-dishes$t$, $t$עם סיום האירוע יש לסדר את הכלים הנקיים ולהשאיר בבסקטים ייעודיים בצורה מסודרת, ולהחזיר כלים לפינויים.$t$, 70),
  ($t$barista-baskets$t$, $t$הוצאה מסודרת של כל הבסקטים (הריקים והמלאים) שנשארו בעמדה, והעברתם לקיפול לקראת סגירת העמדה.$t$, 80),
  ($t$barista-napkins-fill$t$, $t$לוודא מילוי מגבוני ניקיון מכל הסוגים (שורה לכל צבע).$t$, 90),
  ($t$barista-sugar-fill$t$, $t$לוודא מילוי סוכר, סוכר חום וסוכרזית - הכלים מלאים עד הסוף.$t$, 100),
  ($t$barista-coffee-beans-fill$t$, $t$לוודא מילוי של 2 שקיות פולי קפה חדשות בבטן הארון.$t$, 110),
  ($t$barista-boiler-water$t$, $t$לוודא בסיום המשמרת שהמיחם נשאר עם מעט מים (מכסים את מנגנון החימום); בפתיחת המשמרת הבאה יש לרוקן ולמלא מים חדשים.$t$, 120),
  ($t$barista-grinder-empty$t$, $t$לרוקן פולי קפה מהמטחנה לקופסת פלסטיק של 2-4 ליטר.$t$, 130),
  ($t$barista-decorations$t$, $t$לרכז את כל הדקורציה בבטן העמדה.$t$, 140),
  ($t$barista-milk-fridge$t$, $t$לוודא שמקרר החלב מחובר לחשמל בסוף הערב.$t$, 150),
  ($t$barista-cover-machine$t$, $t$כיסוי מכונת הקפה.$t$, 160)
) as v(key, text, sort_order)
where c.checklist_key = 'barista_checklist' and c.key = $t$barista$t$
on conflict (checklist_key, key) do nothing;


-- 4. Who may edit them: the same people who edit the venue settings.
-- (venue_settings already covers system admins, owners and event managers.)
