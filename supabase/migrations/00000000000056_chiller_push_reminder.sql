-- Schedules a one-time push notification per event, timed to the event's
-- actual chuppah time (from timeline_items) minus 20 minutes, instead of a
-- fixed clock time or a frequent poll - neither of which fit (see the
-- reverted attempts in git history). pg_cron's one-time job form (passing a
-- timestamp instead of a repeating cron expression - it fires once, then
-- removes itself) plus pg_net's async HTTP call is what makes this possible
-- on Vercel's Hobby plan, which only allows crons that run once a day: the
-- "polling" happens once inside Postgres at the exact right moment, not in
-- our own app.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Holds small server-side config values, starting with the shared secret
-- app/api/push/chiller-reminder/route.ts checks on the incoming webhook call.
-- Deliberately just the key here, not the real secret - that's inserted
-- separately (given outside of any committed migration) so it never lands
-- in git.
create table if not exists app_settings (
  key text primary key,
  value text not null
);
alter table app_settings enable row level security;

-- Called from insertSchedule/insertFridaySchedule right after inserting a
-- template that includes a חופה step - replaces any previously scheduled
-- job for the same event (e.g. re-running the default-schedule button, or a
-- Friday template whose shift changed the chuppah time).
create or replace function schedule_chiller_reminder(p_event_id uuid, p_run_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_name text := 'chiller-reminder-' || p_event_id::text;
  v_secret text;
  v_url text := 'https://my-event-manager.vercel.app/api/push/chiller-reminder';
begin
  if exists (select 1 from cron.job where jobname = v_job_name) then
    perform cron.unschedule(v_job_name);
  end if;

  -- Nothing to schedule if the computed time has already passed (e.g. the
  -- default schedule was applied same-day, after the 20-minutes-before mark).
  if p_run_at <= now() then
    return;
  end if;

  select value into v_secret from app_settings where key = 'push_webhook_secret';
  if v_secret is null then
    raise notice 'app_settings.push_webhook_secret is not set - skipping chiller reminder schedule';
    return;
  end if;

  perform cron.schedule(
    v_job_name,
    p_run_at,
    format(
      $job$select net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := %L::jsonb
      );$job$,
      v_url,
      jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
      jsonb_build_object('eventId', p_event_id)
    )
  );
end;
$$;

-- Called from the timeline server actions using the normal cookie-based
-- client (the logged-in staff member's own session, "authenticated" role),
-- not the service-role admin client - security definer is what lets it read
-- cron.job/app_settings regardless, but the caller still needs EXECUTE on
-- the function itself.
grant execute on function schedule_chiller_reminder(uuid, timestamptz) to authenticated, service_role;
