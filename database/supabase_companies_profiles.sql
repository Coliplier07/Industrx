-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, before the other new migration files.
-- Adds companies + per-user profiles/roles, the foundation for multi-tenancy.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('admin', 'pm', 'employee')),
  manager_id uuid references public.profiles(id) on delete set null,
  avatar_path text,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- security definer so policies elsewhere can look up "my own company/role"
-- without recursing back through profiles' own RLS.
create or replace function public.current_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- The only way a new company + its first admin get created. Only ever acts
-- on the caller's own auth.uid(), so it's safe to expose to any authenticated
-- user (unlike creating an account for someone else, which always goes
-- through the admin-create-account Edge Function with the service role).
create or replace function public.create_company_and_admin(company_name text, admin_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'A profile already exists for this account.';
  end if;

  insert into public.companies (name) values (company_name) returning id into new_company_id;

  insert into public.profiles (id, company_id, full_name, role)
  values (auth.uid(), new_company_id, admin_full_name, 'admin');

  return new_company_id;
end;
$$;

grant execute on function public.create_company_and_admin(text, text) to authenticated;

-- Prevents privilege escalation: role/company_id/manager_id can only change
-- via the service-role key (the admin-create-account Edge Function), never
-- through a plain client update. Triggers still run for service-role
-- requests even though RLS itself is bypassed for that role.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if (new.role is distinct from old.role
      or new.company_id is distinct from old.company_id
      or new.manager_id is distinct from old.manager_id)
     and auth.role() <> 'service_role' then
    raise exception 'Only an admin action can change role, company, or manager.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create policy "select_own_company_profiles" on public.profiles
  for select using (company_id = public.current_company_id());

create policy "update_own_profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "select_own_company" on public.companies
  for select using (id = public.current_company_id());

-- Private bucket for profile photos, same path-based ownership pattern as
-- the existing "receipts" bucket: "<user_id>/avatar.jpg".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "own_avatar_files_select" on storage.objects
  for select using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_avatar_files_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_avatar_files_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_avatar_files_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
