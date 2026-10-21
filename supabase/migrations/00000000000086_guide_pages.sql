-- The two guide pages (the couple-meeting guide and the event manager's
-- procedures) were fixed text in the source code. They now live in tables the
-- venue edits from the app (/admin/guides). The current text is loaded unchanged.

create table if not exists guide_pages (
  key text primary key,
  title text not null,
  intro text not null default '',
  sort_order integer not null default 0
);

create table if not exists guide_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references guide_pages(key) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists guide_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references guide_sections(id) on delete cascade,
  text text not null,
  sort_order integer not null default 0
);

alter table guide_pages enable row level security;
alter table guide_sections enable row level security;
alter table guide_items enable row level security;

create policy "guide_pages select" on guide_pages for select using (is_staff_member());
create policy "guide_pages update" on guide_pages for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));

create policy "guide_sections select" on guide_sections for select using (is_staff_member());
create policy "guide_sections insert" on guide_sections for insert with check (has_permission('venue_settings', 'write'));
create policy "guide_sections update" on guide_sections for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "guide_sections delete" on guide_sections for delete using (has_permission('venue_settings', 'write'));

create policy "guide_items select" on guide_items for select using (is_staff_member());
create policy "guide_items insert" on guide_items for insert with check (has_permission('venue_settings', 'write'));
create policy "guide_items update" on guide_items for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "guide_items delete" on guide_items for delete using (has_permission('venue_settings', 'write'));

insert into guide_pages (key, title, intro, sort_order)
values ('couple_meeting', $t$פגישה עם זוג$t$, $t$מדריך לנושאים שיש לעבור עליהם בפגישה עם זוג, ולמה שצריך להתבצע לפני ואחרי הפגישה.$t$, 10)
on conflict (key) do nothing;

insert into guide_sections (page_key, label, sort_order)
select 'couple_meeting', $t$נושאים לעבור עליהם בפגישה$t$, 10
where not exists (select 1 from guide_sections where page_key = 'couple_meeting' and label = $t$נושאים לעבור עליהם בפגישה$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$הכרות כללית - פרטים עליהם, על ההורים, ועל העיסוקים שלהם.$t$, 10),
  ($t$מילוי סקירה - בדיקה לגבי חניה, אפטר ובר מרובע.$t$, 20),
  ($t$לוח הזמנים של האירוע - הלו"ז נמצא בטאב "לוח זמנים" בתוך האירוע של הזוג.$t$, 30),
  ($t$לעבור עם הזוג על דף ההנחיות (יישלח אליהם במייל לאחר הפגישה).$t$, 40),
  ($t$להסביר על הסקיצה.$t$, 50),
  ($t$הסבר על ההתחייבות + הרזרבה.$t$, 60),
  ($t$הסבר על מזומן לטיפים ולתשלומים לספקים.$t$, 70)
) as v(text, sort_order)
where s.page_key = 'couple_meeting' and s.label = $t$נושאים לעבור עליהם בפגישה$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'couple_meeting', $t$אחרי הפגישה$t$, 20
where not exists (select 1 from guide_sections where page_key = 'couple_meeting' and label = $t$אחרי הפגישה$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$פתיחת קבוצת וואטסאפ עם הזוג (עד יום אחרי הפגישה).$t$, 10),
  ($t$שליחת הנקודות העיקריות מהפגישה ונקודות להמשך (עד יום אחרי הפגישה).$t$, 20),
  ($t$שליחת דף ההנחיות לזוג במייל, לאחר שעברתם עליו יחד בפגישה (עד יום אחרי הפגישה).$t$, 30),
  ($t$שליחת טופס האירוע לזוג (עד יום אחרי הפגישה).$t$, 40),
  ($t$הכנת סקיצה ראשונית ב-iPlan לפי התחייבות נוכחית (עד יום אחרי הפגישה).$t$, 50),
  ($t$עדכון התחייבות סופית בפרטי האירוע (כשבוע לפני האירוע).$t$, 60),
  ($t$הכנת סקיצה סופית, עדכון הזוג ופתיחת הושבה (כשבוע לפני האירוע).$t$, 70),
  ($t$העלאת סקיצה סופית לאתר - לאחר סיום הושבה (יום לפני האירוע).$t$, 80),
  ($t$העלאת קובץ הזמנות (אורחים) לאתר (יום לפני האירוע).$t$, 90),
  ($t$ווידוא שהזוג מביא את כל הציוד והמעטפות (יום לפני האירוע).$t$, 100)
) as v(text, sort_order)
where s.page_key = 'couple_meeting' and s.label = $t$אחרי הפגישה$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_pages (key, title, intro, sort_order)
values ('event_management_dex', $t$סד"פ ניהול אירוע$t$, $t$מדריך למנהל האירוע לאורך כל האירוע - מהכנות לפני האירוע ועד סופו.$t$, 20)
on conflict (key) do nothing;

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$לפני האירוע (הכנות/תחילת משמרת)$t$, 10
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$לפני האירוע (הכנות/תחילת משמרת)$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$לעבור על לוז אירוע.$t$, 10),
  ($t$לעבור על "מידע נוסף" של האירוע טרם התחלתו.$t$, 20),
  ($t$לקיחת מכשיר קשר.$t$, 30),
  ($t$ספירת מגשים, חולצות וסינרים בתחילת המשמרת - אחריות מנהל הפלור.$t$, 40),
  ($t$עלייה לבריף מלצרים.$t$, 50),
  ($t$תדריך לשומרים - יציאות חירום, עמדות כיבוי אש (עמדה בגב המארחות, עמדה בכוך, עמדה ליד שירותי החצר, עמדה ליד חדר חתן כלה, עמדה בשירותי משרדים למעלה), אוכל (בעמדה + שעות יציאת השומרים לאכול), סיגריות, יציאת ילדים, קאונטרים, ערוץ 12, החזרת ציוד למקום, סיום משמרת שומר 1.$t$, 60),
  ($t$תדרוך דיג'י.$t$, 70),
  ($t$לעבור עם המנהלים על תיאום ציפיות – משקאות מיוחדים (בר), מנות מיוחדות (מטבח\פלור).$t$, 80),
  ($t$במידה ויש הפקה חיצונית – היכרות שירותיו.$t$, 90),
  ($t$במידה ויש סרט להקרין – הדלקת מקרן + ווידוא תקינות מול איש הגברה.$t$, 100),
  ($t$ווידוא מזגנים וצ'ילרים פועלים.$t$, 110),
  ($t$ווידוא תאורת קבלת פנים + תאורת אולם.$t$, 120),
  ($t$ווידוא שדלתות החירום אינן נעולות (מנעול עליון ותחתון) ושאין דברים שמפריעים לגישה לדלת (לדוגמה: שולחנות וכיסאות בכוך).$t$, 130),
  ($t$מנקת שירותים - לבדוק מיקום וניקיון טרם האירוע.$t$, 140),
  ($t$מנקה אולם – מכשיר קשר ואוזניה.$t$, 150),
  ($t$בדיקת ג'ל במשתנות.$t$, 160),
  ($t$נעילת כספת + הימצאות מעטפות, עטים, כוס ופח.$t$, 170),
  ($t$חדר חתן כלה נקי ומסודר (קוד 1245), להוציא את מה שהזוג השאיר יום לפני כן (גומי, כפכפים, אלכוהול וכו').$t$, 180),
  ($t$לעבור על סקיצה אולם וחצר – סידור שולחן, כמויות, כיסאות תינוק וכו'.$t$, 190),
  ($t$לוודא מפיות שחורות על המגשים.$t$, 200),
  ($t$בדיקת ציוד חופה מלא מול הזוג.$t$, 210),
  ($t$וידוא הרמת תריסים 1-8.$t$, 220),
  ($t$ווידוא שדלת ליד המעלון נעולה.$t$, 230)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$לפני האירוע (הכנות/תחילת משמרת)$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$קבלת פנים$t$, 20
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$קבלת פנים$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$הדלקת אורות עמדות קבלת פנים - כפתור בגוף התאורה השמאלי וחיבור עמדת מכתש ועלי לחשמל.$t$, 10),
  ($t$ווידוא שומרים + תגבור במארחת בעת הצורך.$t$, 20),
  ($t$ווידוא מנקים אולם ושירותים (שירותי אולם, חצר, ושירותי חתן כלה).$t$, 30),
  ($t$מלצרית משפחה - שיתוף פעולה מלא עם הזוג + אחראית חופה.$t$, 40),
  ($t$לוודא פינוי פינויים בחצר ובעמדות.$t$, 50),
  ($t$דיג'י מכריז על חופה והתכנסות 10 דק' לפני חופה.$t$, 60)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$קבלת פנים$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$לפני החופה$t$, 30
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$לפני החופה$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$לוודא דיג'י, תאורן ובר מחוברים ללוז שירי כניסת חופה וכו'.$t$, 10),
  ($t$חופה – שולחן, פרוכת, ערכת חתן כלה, יין + 2 כוסות ( מ. משפחה).$t$, 20),
  ($t$ספוט חופה - מס' 20 - 3/4 עוצמה.$t$, 30),
  ($t$העלאת צ'ילר מקבלת הפנים לחופה (בקיץ).$t$, 40),
  ($t$הכנת שביל חופה.$t$, 50),
  ($t$תדריך משפחה בחדר חתן כלה 20 דק לפני החופה.$t$, 60),
  ($t$דגשים בתדריך חופה - סדר כניסה (חתן כלה, הורים, אחים, שושבינים), בקיו של מנהל אירוע בתיאום עם משפחה, סיבוב 90 מעלות, תרגול הינומה, למשוך את הרגע + נשיקה או לחישה, שבירת כוס במכרז הרגל.$t$, 70),
  ($t$דיג'י מכריז על חופה והתכנסות 15 דק' לפני חופה.$t$, 80),
  ($t$התחלת שיר חופה והזנקת שושבינים, אחים, אחיות, זוג עם ההורים.$t$, 90)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$לפני החופה$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$אחרי החופה$t$, 40
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$אחרי החופה$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$פתיחת שתי הדלתות לאחר החופה.$t$, 10),
  ($t$סידור עמדת כספת.$t$, 20),
  ($t$סידור מחדש של החצר לפי סקיצה (שולחנות, כיסאות, פינויים, מאפרות, כיסאות חופה וניקיון כללי).$t$, 30),
  ($t$סידור תאורת חצר + ספוטים.$t$, 40),
  ($t$ווידוא עוצמת מיזוג\תאורה\מוזיקה בעת כניסת האורחים לאולם.$t$, 50),
  ($t$מארחת לכניסת האולם (באירועי הגשה).$t$, 60),
  ($t$ריקודים ראשונים - לדייק תאורה + סגירת דלת אחת.$t$, 70),
  ($t$העברת צ'ילרים לרחבה (באירועי שישי).$t$, 80)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$אחרי החופה$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$לאורך האירוע$t$, 50
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$לאורך האירוע$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$עוצמת מוזיקה טובה.$t$, 10),
  ($t$פינויים שוטפים לטובת מוכנות מקסימלית של האולם לסגירה.$t$, 20),
  ($t$לחפש את הבעיות.$t$, 30)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$לאורך האירוע$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);

insert into guide_sections (page_key, label, sort_order)
select 'event_management_dex', $t$אחרי האירוע$t$, 60
where not exists (select 1 from guide_sections where page_key = 'event_management_dex' and label = $t$אחרי האירוע$t$);

insert into guide_items (section_id, text, sort_order)
select s.id, v.text, v.sort_order
from guide_sections s
cross join (values
  ($t$מילוי צ'קליסט סגירה של כלל בעלי התפקידים ושליחתם במייל מרוכז.$t$, 10)
) as v(text, sort_order)
where s.page_key = 'event_management_dex' and s.label = $t$אחרי האירוע$t$
and not exists (select 1 from guide_items i where i.section_id = s.id);
