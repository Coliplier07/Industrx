-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_timesheet_entries.sql.
-- Adds a "denied" status: when a PM/admin keeps the original hours instead
-- of applying an employee's requested change, the entry goes here instead
-- of back to plain "pending" so the employee sees it was denied and can
-- only accept the original hours, not dispute them again.

alter table public.timesheet_entries drop constraint if exists timesheet_entries_status_check;
alter table public.timesheet_entries add constraint timesheet_entries_status_check
  check (status in ('pending', 'approved', 'disputed', 'denied'));
