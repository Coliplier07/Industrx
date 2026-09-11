-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- Scopes projects (and everything hanging off them) by company instead of
-- by individual user, and backfills existing data so nothing breaks.

alter table public.projects add column if not exists company_id uuid references public.companies(id) on delete cascade;

-- One-time backfill: give every existing project-owning account its own
-- company (named after their email) and an admin profile, then point their
-- projects at it. Safe to run even if some accounts already have a profile
-- (ON CONFLICT / WHERE NOT EXISTS guards below) or if this has already run.
do $$
declare
  owner record;
  new_company_id uuid;
begin
  for owner in
    select distinct p.user_id, u.email
    from public.projects p
    join auth.users u on u.id = p.user_id
    where not exists (select 1 from public.profiles pr where pr.id = p.user_id)
  loop
    insert into public.companies (name) values (coalesce(owner.email, 'My Company'))
    returning id into new_company_id;

    insert into public.profiles (id, company_id, full_name, role)
    values (owner.user_id, new_company_id, coalesce(owner.email, ''), 'admin');
  end loop;
end $$;

update public.projects p
set company_id = pr.company_id
from public.profiles pr
where p.user_id = pr.id and p.company_id is null;

alter table public.projects alter column company_id set not null;

drop policy if exists "own_projects" on public.projects;

create policy "company_projects" on public.projects
  for all using (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  )
  with check (
    company_id = public.current_company_id() and public.current_user_role() in ('pm', 'admin')
  );
