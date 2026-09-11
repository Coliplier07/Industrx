-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor).
-- Creates per-account project/daily-log storage with Row Level Security,
-- so each logged-in account only ever sees its own data.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date timestamptz not null,
  work_description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.labor_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  worker_name text not null default '',
  trade text not null default '',
  st_hours numeric not null default 0,
  ot_hours numeric not null default 0
);

create table if not exists public.equipment_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  equipment_name text not null default '',
  hours_used numeric not null default 0
);

alter table public.projects enable row level security;
alter table public.daily_logs enable row level security;
alter table public.labor_entries enable row level security;
alter table public.equipment_entries enable row level security;

create policy "own_projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_daily_logs" on public.daily_logs
  for all using (
    exists (select 1 from public.projects p where p.id = daily_logs.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = daily_logs.project_id and p.user_id = auth.uid())
  );

create policy "own_labor_entries" on public.labor_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = labor_entries.daily_log_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = labor_entries.daily_log_id and p.user_id = auth.uid()
    )
  );

create policy "own_equipment_entries" on public.equipment_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = equipment_entries.daily_log_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = equipment_entries.daily_log_id and p.user_id = auth.uid()
    )
  );
