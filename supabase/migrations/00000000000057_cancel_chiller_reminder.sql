-- Companion to schedule_chiller_reminder (00000000000056) - used wherever a
-- חופה timeline step gets removed (deleteTimelineItem, deleteAllTimelineItems)
-- so a stale scheduled push doesn't still fire for a step that no longer
-- exists.
create or replace function cancel_chiller_reminder(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_name text := 'chiller-reminder-' || p_event_id::text;
begin
  if exists (select 1 from cron.job where jobname = v_job_name) then
    perform cron.unschedule(v_job_name);
  end if;
end;
$$;

grant execute on function cancel_chiller_reminder(uuid) to authenticated, service_role;
