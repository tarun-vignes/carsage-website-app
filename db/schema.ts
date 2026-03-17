export const AUTOVARO_SCHEMA_SQL = `
create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_json jsonb not null,
  output_json jsonb not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can view own reports"
on public.reports
for select
using (auth.uid() = user_id);

create policy "Users can insert own reports"
on public.reports
for insert
with check (auth.uid() = user_id);

create policy "Users can update own reports"
on public.reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_reports_user_created
on public.reports (user_id, created_at desc);
`;
