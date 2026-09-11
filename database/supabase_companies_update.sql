-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- companies only had a select policy — admins couldn't rename their company.

create policy "admin_updates_own_company" on public.companies
  for update using (
    id = public.current_company_id() and public.current_user_role() = 'admin'
  )
  with check (
    id = public.current_company_id() and public.current_user_role() = 'admin'
  );
