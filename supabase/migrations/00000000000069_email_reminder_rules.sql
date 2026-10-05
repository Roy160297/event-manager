-- Automated email reminders as editable rows (previously hardcoded in
-- lib/coupleMeetingReminders.ts), managed from the push-reminders page by
-- anyone with the push_reminder_rules permission. rule_key is what
-- reminder_log records per (event, rule, day), so the seeded rows keep the
-- keys the old hardcoded rules used and nothing already sent is re-sent.
--
-- subject/body are plain text with {placeholders} (event_name, event_type,
-- event_date, guests, kids_meal_count, ..., additional_info); body line
-- breaks become <br/> when sent.
create table if not exists email_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique default ('custom-' || gen_random_uuid()::text),
  title text not null,
  anchor text not null check (anchor in ('couple_meeting_date', 'event_date')),
  offset_days integer not null,
  -- Only used when anchor is couple_meeting_date and the event has none:
  -- days relative to the event date instead (null = skip such events).
  fallback_offset_days integer,
  match_mode text not null default 'exact' check (match_mode in ('exact', 'on_or_after')),
  run_window text check (run_window in ('morning', 'evening')),
  condition text not null default 'none' check (condition in ('none', 'additional_info_filled', 'supplier_dj_tzach_ziv')),
  to_event_manager boolean not null default false,
  to_salesperson boolean not null default false,
  extra_emails text,
  subject text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table email_reminder_rules enable row level security;

create policy "email_reminder_rules select" on email_reminder_rules for select
  using (has_permission('push_reminder_rules', 'read'));
create policy "email_reminder_rules insert" on email_reminder_rules for insert
  with check (has_permission('push_reminder_rules', 'write'));
create policy "email_reminder_rules update" on email_reminder_rules for update
  using (has_permission('push_reminder_rules', 'write')) with check (has_permission('push_reminder_rules', 'write'));
create policy "email_reminder_rules delete" on email_reminder_rules for delete
  using (has_permission('push_reminder_rules', 'write'));

insert into email_reminder_rules
  (rule_key, title, anchor, offset_days, fallback_offset_days, match_mode, run_window, condition,
   to_event_manager, to_salesperson, extra_emails, subject, body)
values
  ('post-meeting-followup-tasks', 'משימות לאחר פגישת הזוג', 'couple_meeting_date', 1, null, 'exact', null, 'none',
   true, false, null,
   $t$תזכורת: משימות לאחר פגישת הזוג$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}): היום יום אחרי פגישת הזוג - יש לוודא ביצוע המשימות הבאות:
• פתיחת קבוצת וואטסאפ עם הזוג.
• שליחת הנקודות העיקריות מהפגישה, וכן נקודות להמשך.
• שליחת דף ההנחיות לזוג במייל (לאחר שעברתם עליו יחד בפגישה).
• שליחת טופס האירוע לזוג.
• הכנת סקיצה ראשונית ב-iPlan לפי התחייבות נוכחית.$t$),

  ('final-commitment-and-sketch-update', 'עדכון התחייבות סופית', 'event_date', -7, null, 'on_or_after', null, 'none',
   true, false, null,
   $t$תזכורת: עדכון התחייבות סופית$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}): היום התאריך (שבוע לפני האירוע) - יש לבצע את המשימות הבאות:
• עדכון ההתחייבות הסופית בפרטי האירוע.
• הכנת סקיצה סופית, עדכון הזוג ופתיחת הושבה.$t$),

  ('dj-tzach-ziv-sketch-update', 'עדכון סקיצה - הדיג''י צח זיו', 'event_date', -7, null, 'on_or_after', null, 'supplier_dj_tzach_ziv',
   true, false, null,
   $t$תזכורת: עדכון סקיצה - הדיג'י צח זיו$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}): הדיג'י באירוע הוא צח זיו - יש לעדכן את הסקיצה בהתאם: להוציא את עמדת הדיג'י העגולה ולהכניס במה במקומה.$t$),

  ('day-before-event-tasks', 'משימות ליום שלפני האירוע', 'event_date', -1, null, 'exact', null, 'none',
   true, false, null,
   $t$תזכורת: משימות ליום שלפני האירוע$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}), המתקיים מחר - יש לבצע את המשימות הבאות:
• העלאת קובץ הזמנות (אורחים) לאתר.
• העלאת סקיצה סופית לאתר, לאחר סיום הושבה.
• ווידוא שהזוג מביא את כל הציוד והמעטפות.$t$),

  ('kitchen-meal-breakdown', 'פירוט מנות למטבח', 'event_date', -1, null, 'exact', null, 'none',
   false, false, 'chef@house7.co.il, eva.b@house7.co.il',
   $t$פירוט מנות לקראת האירוע של {event_name} - {event_type} - {event_date}$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}), המתקיים מחר - פירוט מנות:
• מספר אורחים - התחייבות: {guests}
• מנות ילדים: {kids_meal_count}
• מנות גלאט: {glat_meal_count}
• מנות צמחוניות: {vegetarian_meal_count}
• מנות טבעוניות: {vegan_meal_count}
• מנות ללא גלוטן: {gluten_free_meal_count}
• ילדים מתחת לגיל 2: {toddlers_under_2_count}$t$),

  ('additional-info-event-morning-sniro', 'מידע נוסף - בוקר האירוע (שניר)', 'event_date', 0, null, 'exact', 'morning', 'additional_info_filled',
   false, false, 'sniro111oshri@gmail.com',
   $t$מידע נוסף לקראת האירוע של {event_name} - {event_date}$t$,
   $t$תזכורת לגבי האירוע של {event_name} (בתאריך {event_date}), המתקיים היום - המידע הנוסף שמולא לאירוע:
{additional_info}$t$),

  ('additional-info-post-meeting', 'מידע נוסף - אחרי פגישת הזוג', 'couple_meeting_date', 1, -7, 'on_or_after', null, 'additional_info_filled',
   false, true, 'sniro111oshri@gmail.com',
   $t$מידע נוסף על האירוע של {event_name} - {event_date}$t$,
   $t$לגבי האירוע של {event_name} (בתאריך {event_date}) - המידע הנוסף שמולא לאירוע:
{additional_info}$t$)
on conflict (rule_key) do nothing;
