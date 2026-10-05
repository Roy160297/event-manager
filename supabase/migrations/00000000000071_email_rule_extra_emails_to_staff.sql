-- Typed-in "extra addresses" are no longer offered when editing an email
-- reminder (recipients are picked from the list). Where a typed address is
-- really a staff member's email, switch it to that staff member so it stays
-- editable; any other address is left in place and keeps receiving.
do $$
declare
  r record;
  e text;
  sid uuid;
  ids uuid[];
  remaining text[];
begin
  for r in select id, extra_emails, recipient_staff_ids from email_reminder_rules where extra_emails is not null loop
    ids := r.recipient_staff_ids;
    remaining := '{}';
    foreach e in array regexp_split_to_array(trim(r.extra_emails), '[,;\s]+') loop
      if e = '' then continue; end if;
      sid := null;
      select id into sid from staff where lower(email) = lower(e) limit 1;
      if sid is not null then
        if not (sid = any(ids)) then ids := ids || sid; end if;
      else
        remaining := remaining || e;
      end if;
    end loop;
    update email_reminder_rules
      set recipient_staff_ids = ids,
          extra_emails = nullif(array_to_string(remaining, ', '), '')
      where id = r.id;
  end loop;
end $$;
