-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_timesheet_entries.sql.
-- A PM can now submit/see their own hours too, not just their crew's.

drop policy if exists "pm_manages_crew_timesheet" on public.timesheet_entries;
create policy "pm_manages_crew_timesheet" on public.timesheet_entries
  for all using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'pm'
    and (
      timesheet_entries.employee_id = auth.uid()
      or exists (
        select 1 from public.profiles e where e.id = timesheet_entries.employee_id and e.manager_id = auth.uid()
      )
    )
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() = 'pm'
    and (
      timesheet_entries.employee_id = auth.uid()
      or exists (
        select 1 from public.profiles e where e.id = timesheet_entries.employee_id and e.manager_id = auth.uid()
      )
    )
  );
