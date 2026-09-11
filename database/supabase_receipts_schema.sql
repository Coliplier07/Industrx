-- Run this in the Supabase Dashboard SQL Editor (Database > SQL Editor),
-- after supabase_projects_schema.sql has already been run.
-- Adds project-level receipts (photo + date), stored as private files in
-- Storage, visible only to the project's owning account.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date timestamptz not null,
  image_path text not null,
  created_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

create policy "own_receipts" on public.receipts
  for all using (
    exists (select 1 from public.projects p where p.id = receipts.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = receipts.project_id and p.user_id = auth.uid())
  );

-- Private bucket for receipt photos. Files are stored at
-- "<user_id>/<project_id>/<uuid>.jpg" so the storage policies below can
-- check ownership just from the path, without a DB lookup.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "own_receipt_files_select" on storage.objects
  for select using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_receipt_files_insert" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_receipt_files_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );
