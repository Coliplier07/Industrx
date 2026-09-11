-- Run this in the Supabase Dashboard SQL Editor, after supabase_receipts_schema.sql.
-- Adds a total-amount field to receipts.

alter table public.receipts
  add column if not exists amount numeric not null default 0;
