-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- Admin-managed Master Rate Sheet: labor/equipment/per-diem/upcharge rates.

create table if not exists public.rate_sheet_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null check (category in ('labor', 'equipment', 'per_diem', 'upcharge')),
  name text not null,
  rate_type text not null check (rate_type in ('hourly', 'daily', 'per_job', 'percentage')),
  rate numeric not null,
  ot_rate numeric,
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.rate_sheet_items enable row level security;

create policy "admin_manages_rate_sheet" on public.rate_sheet_items
  for all using (
    company_id = public.current_company_id() and public.current_user_role() = 'admin'
  )
  with check (
    company_id = public.current_company_id() and public.current_user_role() = 'admin'
  );
