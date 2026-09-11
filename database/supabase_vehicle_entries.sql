-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor).
-- Adds per-daily-log vehicle hour tracking, mirroring equipment_entries.

create table if not exists public.vehicle_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  vehicle_name text not null default '',
  hours_used numeric not null default 0
);

alter table public.vehicle_entries enable row level security;

create policy "own_vehicle_entries" on public.vehicle_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = vehicle_entries.daily_log_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = vehicle_entries.daily_log_id and p.user_id = auth.uid()
    )
  );
