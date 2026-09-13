-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_daily_log_entries_name_snapshot.sql.
--
-- Adds a stored dollar cost for equipment/vehicle daily log entries whose
-- rate sheet item is a flat daily rate. The app computes this once when
-- the entry is saved (daily rate / 8, times hours used, if hours used is
-- over 8 -- otherwise just the flat daily rate) and stores the result, the
-- same reasoning as the name snapshot: so it stays accurate even if the
-- rate sheet's dollar amount changes later. Null for hourly/per-job items,
-- which this doesn't apply to.

alter table public.equipment_entries add column if not exists cost numeric;
alter table public.vehicle_entries add column if not exists cost numeric;
