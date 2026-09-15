-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_timesheet_entries.sql.
-- Blocks logging hours for a future date. The app's date picker already
-- restricts this in the UI, but that check uses the device's own clock,
-- which a PM/admin could change to get around it. This check runs on the
-- database server instead, using the server's clock, so changing a
-- phone's date/time settings has no effect on it.

create or replace function public.reject_future_timesheet_dates()
returns trigger
language plpgsql
as $$
begin
  if new.date > current_date then
    raise exception 'Cannot log hours for a future date.';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_future_timesheet_dates_trigger on public.timesheet_entries;
create trigger reject_future_timesheet_dates_trigger
  before insert or update on public.timesheet_entries
  for each row execute function public.reject_future_timesheet_dates();
