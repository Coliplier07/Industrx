-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_timesheet_entries.sql.
-- Lets a PM/admin be deleted even after they've logged hours for someone
-- else. logged_by had no ON DELETE rule (defaults to RESTRICT), so
-- deleting a PM who had ever submitted hours for their crew would fail
-- outright with a foreign-key error. This keeps the other person's hours
-- record intact and just clears who originally logged it.

alter table public.timesheet_entries alter column logged_by drop not null;
alter table public.timesheet_entries drop constraint if exists timesheet_entries_logged_by_fkey;
alter table public.timesheet_entries add constraint timesheet_entries_logged_by_fkey
  foreign key (logged_by) references public.profiles(id) on delete set null;
