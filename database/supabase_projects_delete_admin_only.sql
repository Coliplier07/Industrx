-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_projects_company_scope.sql.
-- PM can still create/edit projects, but only admin can delete one.
-- A single "for all" policy can't be narrowed by command, so this splits
-- it into per-command policies instead.

drop policy if exists "company_projects" on public.projects;

create policy "company_projects_select" on public.projects
  for select using (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  );

create policy "company_projects_insert" on public.projects
  for insert with check (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  );

create policy "company_projects_update" on public.projects
  for update using (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  )
  with check (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  );

create policy "company_projects_delete" on public.projects
  for delete using (
    company_id = public.current_company_id() and public.current_user_role() = 'admin'
  );
