-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- PM/admin submit hours for an employee; the employee approves or disputes.

create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  st_hours numeric not null default 0,
  ot_hours numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'disputed')),
  dispute_reason text,
  requested_st_hours numeric,
  requested_ot_hours numeric,
  logged_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

alter table public.timesheet_entries enable row level security;

-- RLS alone can't restrict individual columns. This is what actually stops
-- an employee from editing their own hours instead of just approving or
-- disputing them (mirrors protect_profile_privileges' pattern). When a
-- PM/admin corrects hours or the date on an existing row, it reopens for
-- review (status back to pending, dispute fields cleared).
create or replace function public.protect_timesheet_hours()
returns trigger
language plpgsql
as $$
begin
  if (new.st_hours is distinct from old.st_hours
      or new.ot_hours is distinct from old.ot_hours
      or new.date is distinct from old.date
      or new.employee_id is distinct from old.employee_id
      or new.company_id is distinct from old.company_id
      or new.logged_by is distinct from old.logged_by)
     and public.current_user_role() not in ('pm', 'admin') then
    raise exception 'Only a PM or admin can change hours, date, or assignment.';
  end if;

  if (new.st_hours is distinct from old.st_hours
      or new.ot_hours is distinct from old.ot_hours
      or new.date is distinct from old.date) then
    new.status := 'pending';
    new.dispute_reason := null;
    new.requested_st_hours := null;
    new.requested_ot_hours := null;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_timesheet_hours_trigger on public.timesheet_entries;
create trigger protect_timesheet_hours_trigger
  before update on public.timesheet_entries
  for each row execute function public.protect_timesheet_hours();

create policy "admin_manages_timesheet" on public.timesheet_entries
  for all using (
    company_id = public.current_company_id() and public.current_user_role() = 'admin'
  )
  with check (
    company_id = public.current_company_id() and public.current_user_role() = 'admin'
  );

create policy "pm_manages_crew_timesheet" on public.timesheet_entries
  for all using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'pm'
    and exists (
      select 1 from public.profiles e where e.id = timesheet_entries.employee_id and e.manager_id = auth.uid()
    )
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = 'pm'
    and exists (
      select 1 from public.profiles e where e.id = timesheet_entries.employee_id and e.manager_id = auth.uid()
    )
  );

create policy "employee_views_own_timesheet" on public.timesheet_entries
  for select using (employee_id = auth.uid());

create policy "employee_updates_own_timesheet" on public.timesheet_entries
  for update using (employee_id = auth.uid())
  with check (employee_id = auth.uid());
