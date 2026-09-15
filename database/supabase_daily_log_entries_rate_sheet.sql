-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_rate_sheet_vehicle.sql and
-- supabase_daily_logs_company_scope.sql.
--
-- Daily log labor/equipment/vehicle entries were free-text (any name could
-- be typed in), disconnected from both the company's actual roster and its
-- Master Rate Sheet. This ties them to real records instead: labor entries
-- pick a real employee/PM plus a labor role from the rate sheet (and
-- optionally a per-diem rate), equipment/vehicle entries pick a real rate
-- sheet item.
--
-- Nullable with ON DELETE SET NULL (not NOT NULL / CASCADE): if the
-- referenced person or rate sheet item is later deleted, the historical
-- daily log entry stays instead of disappearing or blocking the delete.
-- The app itself requires a selection before letting you save a new entry.

alter table public.labor_entries
  add column if not exists employee_id uuid references public.profiles(id) on delete set null,
  add column if not exists rate_sheet_item_id uuid references public.rate_sheet_items(id) on delete set null,
  add column if not exists per_diem_item_id uuid references public.rate_sheet_items(id) on delete set null;
alter table public.labor_entries drop column if exists worker_name;
alter table public.labor_entries drop column if exists trade;

alter table public.equipment_entries
  add column if not exists rate_sheet_item_id uuid references public.rate_sheet_items(id) on delete set null;
alter table public.equipment_entries drop column if exists equipment_name;

alter table public.vehicle_entries
  add column if not exists rate_sheet_item_id uuid references public.rate_sheet_items(id) on delete set null;
alter table public.vehicle_entries drop column if exists vehicle_name;

-- rate_sheet_items only had one policy (admin_manages_rate_sheet), which
-- requires role = 'admin' for every command including SELECT -- a PM
-- filling out a daily log couldn't read the rate sheet at all to populate
-- these pickers. This adds read-only access for PMs alongside it.
create policy "pm_reads_rate_sheet" on public.rate_sheet_items
  for select using (
    company_id = public.current_company_id() and public.current_user_role() = 'pm'
  );
