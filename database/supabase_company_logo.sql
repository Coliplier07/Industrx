-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- in a brand-new empty query tab, AFTER supabase_companies_profiles.sql.
-- Lets an admin upload a company logo, shown in the header on every screen.

alter table public.companies add column if not exists logo_path text;

-- Private bucket, same pattern as "avatars" and "receipts": everyone in the
-- company can view the logo (it's shown to every role in the header), but
-- only an admin can upload/change/remove it. Path convention:
-- "<company_id>/logo.jpg".
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', false)
on conflict (id) do nothing;

create policy "company_logo_select" on storage.objects
  for select using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "admin_inserts_company_logo" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = 'admin'
  );

create policy "admin_updates_company_logo" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = 'admin'
  );

create policy "admin_deletes_company_logo" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() = 'admin'
  );
