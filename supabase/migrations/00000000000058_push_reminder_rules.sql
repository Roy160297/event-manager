-- Generalizes the one-off "20 minutes before חופה" push (schedule_chiller_
-- reminder / cancel_chiller_reminder, 00000000000056/57) into a data-driven
-- rule table any staff member with the new push_reminder_rules permission
-- can manage themselves via the app - each row says "N minutes before/after
-- timeline step X, send this push to the event's manager" - instead of a
-- single case hardcoded into the app.
alter table role_permissions drop constraint if exists role_permissions_resource_check;
alter table role_permissions add constraint role_permissions_resource_check
  check (resource in (
    'events', 'guests', 'tasks', 'closing_checklist', 'event_summary_report',
    'timeline', 'staffing', 'waiters', 'admin',
    'floor_manager_checklist', 'bar_checklist', 'barista_checklist',
    'couple_meeting', 'event_management_dex', 'my_tasks', 'menu', 'calendar',
    'business_event_checklist', 'push_reminder_rules'
  ));

insert into role_permissions (role_id, resource, can_read, can_write)
select r.id, 'push_reminder_rules', true, true
from roles r
where r.name = 'מנהל מערכת'
on conflict (role_id, resource) do nothing;

create table if not exists push_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  anchor_label text not null,
  offset_minutes integer not null,
  notification_title text not null,
  notification_body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table push_reminder_rules enable row level security;

create policy "push_reminder_rules select" on push_reminder_rules for select
  using (has_permission('push_reminder_rules', 'read'));
create policy "push_reminder_rules insert" on push_reminder_rules for insert
  with check (has_permission('push_reminder_rules', 'write'));
create policy "push_reminder_rules update" on push_reminder_rules for update
  using (has_permission('push_reminder_rules', 'write')) with check (has_permission('push_reminder_rules', 'write'));
create policy "push_reminder_rules delete" on push_reminder_rules for delete
  using (has_permission('push_reminder_rules', 'write'));

-- Carries over the one rule that already existed as hardcoded logic.
insert into push_reminder_rules (title, anchor_label, offset_minutes, notification_title, notification_body)
select 'העלאת צ''ילר לחופה', 'חופה', -20, 'תזכורת: העלאת צ''ילר לחופה',
       'האירוע של {event_name} - 20 דקות לפני החופה, יש להעלות צ''ילר לחופה.'
where not exists (select 1 from push_reminder_rules where anchor_label = 'חופה' and offset_minutes = -20);

drop function if exists schedule_chiller_reminder(uuid, timestamptz);
drop function if exists cancel_chiller_reminder(uuid);

-- Called whenever any timeline step is inserted/edited/shifted (see
-- app/events/[id]/timeline/actions.ts) - a no-op if no active rule is
-- anchored to p_label. Replaces any previously scheduled job for the same
-- (rule, event) pair, so re-saving a step's time reschedules rather than
-- doubling up.
create or replace function schedule_push_reminders_for_step(p_event_id uuid, p_label text, p_time text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_date date;
  v_secret text;
  v_url text := 'https://my-event-manager.vercel.app/api/push/reminder';
  v_rule record;
  v_job_name text;
  v_run_at timestamptz;
  v_cron_expr text;
begin
  select event_date into v_event_date from events where id = p_event_id;
  if v_event_date is null then
    return;
  end if;

  select value into v_secret from app_settings where key = 'push_webhook_secret';
  if v_secret is null then
    raise notice 'app_settings.push_webhook_secret is not set - skipping push reminder scheduling';
    return;
  end if;

  for v_rule in select * from push_reminder_rules where anchor_label = p_label and active loop
    v_job_name := 'push-reminder-' || v_rule.id::text || '-' || p_event_id::text;

    if exists (select 1 from cron.job where jobname = v_job_name) then
      perform cron.unschedule(v_job_name);
    end if;

    -- "at time zone 'Asia/Jerusalem'" on a plain timestamp interprets it as
    -- wall-clock time in that zone and converts to the correct UTC instant
    -- (DST-aware via Postgres's own tz database) - then the rule's offset is
    -- plain instant arithmetic, so it can't get confused by a day rollover.
    v_run_at := ((v_event_date::text || ' ' || p_time)::timestamp at time zone 'Asia/Jerusalem')
                + make_interval(mins => v_rule.offset_minutes);

    if v_run_at <= now() then
      continue;
    end if;

    -- pg_cron has no "run once at this exact timestamp" primitive - only
    -- standard 5-field cron expressions, which have no year component. Build
    -- an expression matching this exact minute/hour/day/month (pg_cron
    -- evaluates schedules in UTC) and have the job unschedule itself as its
    -- first action, so it only ever actually fires the once despite the
    -- bare pattern otherwise recurring next year.
    v_cron_expr := format(
      '%s %s %s %s *',
      extract(minute from v_run_at at time zone 'UTC')::int,
      extract(hour from v_run_at at time zone 'UTC')::int,
      extract(day from v_run_at at time zone 'UTC')::int,
      extract(month from v_run_at at time zone 'UTC')::int
    );

    perform cron.schedule(
      v_job_name,
      v_cron_expr,
      format(
        $job$select cron.unschedule(%L); select net.http_post(
          url := %L,
          headers := %L::jsonb,
          body := %L::jsonb
        );$job$,
        v_job_name,
        v_url,
        jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
        jsonb_build_object('eventId', p_event_id, 'ruleId', v_rule.id)
      )
    );
  end loop;
end;
$$;

grant execute on function schedule_push_reminders_for_step(uuid, text, text) to authenticated, service_role;

-- Called wherever a timeline step is deleted (p_label = that step's own
-- label, cancelling just the rules anchored to it) or a whole timeline is
-- wiped (p_label = null, cancelling every push-reminder job for the event
-- regardless of which rule scheduled it).
create or replace function cancel_push_reminders_for_event(p_event_id uuid, p_label text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
begin
  if p_label is null then
    for v_job in select jobname from cron.job where jobname like 'push-reminder-%-' || p_event_id::text loop
      perform cron.unschedule(v_job.jobname);
    end loop;
  else
    for v_job in
      select 'push-reminder-' || r.id::text || '-' || p_event_id::text as jobname
      from push_reminder_rules r
      where r.anchor_label = p_label
    loop
      if exists (select 1 from cron.job where jobname = v_job.jobname) then
        perform cron.unschedule(v_job.jobname);
      end if;
    end loop;
  end if;
end;
$$;

grant execute on function cancel_push_reminders_for_event(uuid, text) to authenticated, service_role;
