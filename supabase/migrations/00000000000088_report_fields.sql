-- The event summary report's fields (production company, guest counts, staff
-- counts, hours, the free-text summary...) were fixed columns on the events table
-- and fixed markup in three places. They are now defined in report_fields, which
-- the venue edits from the app (/admin/report) - add, remove, rename, reorder, set
-- a default - and each event keeps its values in events.report_values (a JSON map
-- of field key -> value). The existing columns are copied over unchanged.

create table if not exists report_fields (
  key text primary key,
  label text not null,
  -- text | number | time | longtext, or floor_manager (read-only: shows the event's floor manager)
  field_type text not null default 'text' check (field_type in ('text', 'number', 'time', 'longtext', 'floor_manager')),
  -- Pre-filled in the form until the report is first saved.
  default_value text,
  -- Long texts only: also listed on the "notes and summaries" page.
  show_in_notes boolean not null default false,
  -- When set, a photo can be attached next to the field; the value is the photo slot.
  photo_slot text,
  sort_order integer not null default 0
);

alter table report_fields enable row level security;
create policy "report_fields select" on report_fields for select using (is_staff_member());
create policy "report_fields insert" on report_fields for insert with check (has_permission('venue_settings', 'write'));
create policy "report_fields update" on report_fields for update
  using (has_permission('venue_settings', 'write')) with check (has_permission('venue_settings', 'write'));
create policy "report_fields delete" on report_fields for delete using (has_permission('venue_settings', 'write'));

alter table events add column if not exists report_values jsonb not null default '{}'::jsonb;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$production_company$t$, $t$חברת הפקה$t$, 'text', null, false, null, 10)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$report_end_time$t$, $t$שעת סיום האירוע$t$, 'time', null, false, null, 20)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$exit_time$t$, $t$שעת יציאה מהאולם$t$, 'time', null, false, null, 30)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$final_guest_count_counter$t$, $t$כמות אורחים סופית - קאונטר$t$, 'text', null, false, $t$counter$t$, 40)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$final_guest_count_iplan$t$, $t$כמות אורחים סופית - אייפלן (כולל דף נוספים)$t$, 'text', null, false, null, 50)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$reserve_opened_count$t$, $t$כמות רזרבה שנפתחו$t$, 'text', null, false, null, 60)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$final_children_count$t$, $t$כמות ילדים (אורחים)$t$, 'text', null, false, null, 70)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$bar_manager_name$t$, $t$מנהל בר$t$, 'text', null, false, null, 80)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$bartender_count$t$, $t$כמות ברמנים$t$, 'text', null, false, null, 90)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$floor_manager$t$, $t$מנהל פלור$t$, 'floor_manager', null, false, null, 100)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$waiter_count$t$, $t$כמות מלצרים$t$, 'text', null, false, null, 110)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$initial_tray_count$t$, $t$כמות מגשים התחלתית$t$, 'text', null, false, null, 120)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$final_tray_count$t$, $t$כמות מגשים סופית$t$, 'text', null, false, null, 130)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$cook_count$t$, $t$כמות טבחים$t$, 'text', null, false, null, 140)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$kitchen_dishwasher_count$t$, $t$כמות מנקי מטבח$t$, 'text', $t$2$t$, false, null, 150)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$kitchen_dishwasher_hours$t$, $t$שעות מנקי מטבח$t$, 'text', null, false, null, 160)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$dishwasher_count$t$, $t$כמות שוטפי כלים$t$, 'text', $t$3$t$, false, null, 170)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$dishwasher_hours$t$, $t$שעות שוטפי כלים$t$, 'text', null, false, null, 180)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$security_guard_count$t$, $t$כמות מאבטחים$t$, 'text', $t$2$t$, false, null, 190)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$security_guard_hours$t$, $t$שעות מאבטחים$t$, 'text', null, false, null, 200)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$hall_cleaner_hours$t$, $t$שעות מנקה אולם$t$, 'text', null, false, null, 210)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$restroom_cleaner_hours$t$, $t$שעות מנקה שירותים$t$, 'text', null, false, null, 220)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$report_summary$t$, $t$סיכום האירוע$t$, 'longtext', null, true, null, 230)
on conflict (key) do nothing;

insert into report_fields (key, label, field_type, default_value, show_in_notes, photo_slot, sort_order)
values ($t$report_general_notes$t$, $t$הערות כלליות ופידבק מלצרים$t$, 'longtext', null, true, null, 240)
on conflict (key) do nothing;

-- Copy what is already saved on the events.
update events set report_values = jsonb_strip_nulls(jsonb_build_object(
  'production_company', production_company,
  'report_end_time', report_end_time,
  'exit_time', exit_time,
  'final_guest_count_counter', final_guest_count_counter,
  'final_guest_count_iplan', final_guest_count_iplan,
  'reserve_opened_count', reserve_opened_count,
  'final_children_count', final_children_count,
  'bar_manager_name', bar_manager_name,
  'bartender_count', bartender_count,
  'waiter_count', waiter_count,
  'initial_tray_count', initial_tray_count,
  'final_tray_count', final_tray_count,
  'cook_count', cook_count,
  'kitchen_dishwasher_count', kitchen_dishwasher_count,
  'kitchen_dishwasher_hours', kitchen_dishwasher_hours,
  'dishwasher_count', dishwasher_count,
  'dishwasher_hours', dishwasher_hours,
  'security_guard_count', security_guard_count,
  'security_guard_hours', security_guard_hours,
  'hall_cleaner_hours', hall_cleaner_hours,
  'restroom_cleaner_hours', restroom_cleaner_hours,
  'report_summary', report_summary,
  'report_general_notes', report_general_notes
))
where report_values = '{}'::jsonb;
