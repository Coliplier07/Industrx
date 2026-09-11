-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- 0 = Sunday .. 6 = Saturday. Which day of the week each company's pay
-- period starts on, since different companies run different schedules.

alter table public.companies
  add column if not exists pay_period_start_day integer not null default 0
  check (pay_period_start_day between 0 and 6);
