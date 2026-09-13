-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_daily_log_entries_rate_sheet.sql.
--
-- The employee_id/rate_sheet_item_id/per_diem_item_id foreign keys added in
-- supabase_daily_log_entries_rate_sheet.sql are live references -- renaming
-- a rate sheet item, or renaming/deleting a person, silently rewrites how
-- every past daily log displays, since the name was never actually stored
-- anywhere. This adds a plain-text snapshot of each name, captured by the
-- app at the moment a daily log entry is saved, so history stays accurate
-- no matter what happens to the rate sheet or roster afterward. The foreign
-- keys stay too, for referential integrity and any future filtering/reporting.

alter table public.labor_entries
  add column if not exists employee_name text not null default '',
  add column if not exists role_name text not null default '',
  add column if not exists per_diem_name text;

alter table public.equipment_entries
  add column if not exists equipment_name text not null default '';

alter table public.vehicle_entries
  add column if not exists vehicle_name text not null default '';
