-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_rate_sheet.sql.
-- Adds "vehicle" as its own rate category, matching the app's existing
-- separate vehicle_entries tracking on daily logs (distinct from equipment).

alter table public.rate_sheet_items drop constraint if exists rate_sheet_items_category_check;
alter table public.rate_sheet_items add constraint rate_sheet_items_category_check
  check (category in ('labor', 'equipment', 'vehicle', 'per_diem', 'upcharge'));
