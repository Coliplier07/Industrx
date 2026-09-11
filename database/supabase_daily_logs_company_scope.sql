-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_projects_company_scope.sql.
--
-- When projects became company-scoped, its child tables (daily_logs and
-- everything hanging off them, plus receipts) were left on the old
-- single-owner rule (project.user_id = auth.uid()), so a PM who didn't
-- personally create a project could see the project itself but nothing
-- inside it. This brings them in line with the same company_id + role
-- check projects itself now uses.

drop policy if exists "own_daily_logs" on public.daily_logs;
create policy "company_daily_logs" on public.daily_logs
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = daily_logs.project_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = daily_logs.project_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

drop policy if exists "own_labor_entries" on public.labor_entries;
create policy "company_labor_entries" on public.labor_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = labor_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = labor_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

drop policy if exists "own_equipment_entries" on public.equipment_entries;
create policy "company_equipment_entries" on public.equipment_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = equipment_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = equipment_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

drop policy if exists "own_vehicle_entries" on public.vehicle_entries;
create policy "company_vehicle_entries" on public.vehicle_entries
  for all using (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = vehicle_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.daily_logs dl
      join public.projects p on p.id = dl.project_id
      where dl.id = vehicle_entries.daily_log_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

drop policy if exists "own_receipts" on public.receipts;
create policy "company_receipts" on public.receipts
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = receipts.project_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = receipts.project_id
        and p.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

-- Receipt photo files are stored at "<uploader_id>/<project_id>/<file>", and
-- the existing storage policies only let the exact uploader read/delete
-- their own files — same gap as above, just in Storage instead of the DB.
-- A PM viewing a receipt someone else on the team uploaded would get a
-- working DB row now but a broken photo. Insert stays self-only (you only
-- ever upload into your own folder); select/delete become company-scoped so
-- viewing and editing/deleting someone else's receipt works too.
drop policy if exists "own_receipt_files_select" on storage.objects;
create policy "company_receipt_files_select" on storage.objects
  for select using (
    bucket_id = 'receipts' and exists (
      select 1 from public.profiles uploader
      where uploader.id = ((storage.foldername(name))[1])::uuid
        and uploader.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );

drop policy if exists "own_receipt_files_delete" on storage.objects;
create policy "company_receipt_files_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts' and exists (
      select 1 from public.profiles uploader
      where uploader.id = ((storage.foldername(name))[1])::uuid
        and uploader.company_id = public.current_company_id()
        and public.current_user_role() in ('pm', 'admin')
    )
  );
