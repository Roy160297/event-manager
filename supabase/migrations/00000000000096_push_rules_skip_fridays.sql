-- A push reminder can be marked "not on Fridays": it is then never scheduled for
-- an event held on a Friday (Friday weddings run to a different timetable).
alter table push_reminder_rules add column if not exists skip_fridays boolean not null default false;

-- A step matches a rule when its label equals the rule's anchor, or continues it
-- after a dash ("קבלת פנים - עמדות פתוחות").
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

  for v_rule in
    select * from push_reminder_rules
    where active and (anchor_label = p_label or p_label like anchor_label || ' -%')
  loop
    v_job_name := 'push-reminder-' || v_rule.id::text || '-' || p_event_id::text;

    if exists (select 1 from cron.job where jobname = v_job_name) then
      perform cron.unschedule(v_job_name);
    end if;

    -- A rule marked "not on Fridays" is dropped (after clearing any job it had)
    -- when the event is on a Friday (dow 5), e.g. after the date was moved.
    if v_rule.skip_fridays and extract(dow from v_event_date) = 5 then
      continue;
    end if;

    v_run_at := ((v_event_date::text || ' ' || p_time)::timestamp at time zone 'Asia/Jerusalem')
                + make_interval(mins => v_rule.offset_minutes);

    if v_run_at <= now() then
      continue;
    end if;

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

-- Schedules every reminder an upcoming event is missing. Safe to run any time:
-- an event/rule pair that already has its job is left alone.
create or replace function backfill_push_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step record;
  v_count integer := 0;
begin
  for v_step in
    select distinct e.id as event_id, t.label, t.approx_time::text as approx_time
    from events e
    join timeline_items t on t.event_id = e.id
    join push_reminder_rules r
      on r.active and (t.label = r.anchor_label or t.label like r.anchor_label || ' -%')
         and not (r.skip_fridays and extract(dow from e.event_date) = 5)
    where e.deleted_at is null
      and e.event_date >= (now() at time zone 'Asia/Jerusalem')::date
      and coalesce(t.approx_time::text, '') <> ''
      and not exists (
        select 1 from cron.job j where j.jobname = 'push-reminder-' || r.id::text || '-' || e.id::text
      )
  loop
    perform schedule_push_reminders_for_step(v_step.event_id, v_step.label, v_step.approx_time);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function backfill_push_reminders() to authenticated, service_role;

select backfill_push_reminders();
