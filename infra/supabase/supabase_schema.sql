-- ============================================================
-- AICG / PolicyShield – Current Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 0. Enable extensions ──
create extension if not exists "uuid-ossp";

-- ── 1. Identity model ──
-- User identity and profile metadata are managed directly by Supabase Auth.
-- The application reads fields such as full_name from auth.users.raw_user_meta_data.

-- ── 2. Policies ──
create table public.policies (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  status           text not null default 'uploaded' check (status in ('uploaded','analyzing','analyzed')),
  category         text,
  compliance_score    real,
  file_url             text,
  nca_controls_mapped  jsonb default '[]'::jsonb,
  analysis_result      jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.policies enable row level security;
alter table public.policies force row level security;

drop policy if exists "Users CRUD own policies" on public.policies;
drop policy if exists "Users can select own policies" on public.policies;
drop policy if exists "Users can insert own policies" on public.policies;
drop policy if exists "Users can update own policies" on public.policies;
drop policy if exists "Users can delete own policies" on public.policies;

create policy "Users can select own policies"
  on public.policies for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own policies"
  on public.policies for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own policies"
  on public.policies for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own policies"
  on public.policies for delete to authenticated
  using (auth.uid() = user_id);

create index idx_policies_user on public.policies(user_id, created_at desc);

-- ── 3. Compliance Assessments ──
create table public.assessments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  framework     text not null,
  status        text not null default 'draft' check (status in ('draft','in_progress','completed')),
  overall_score real,
  results       jsonb not null default '[]'::jsonb,
  comments      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.assessments enable row level security;
alter table public.assessments force row level security;

drop policy if exists "Users CRUD own assessments" on public.assessments;
drop policy if exists "Users can select own assessments" on public.assessments;
drop policy if exists "Users can insert own assessments" on public.assessments;
drop policy if exists "Users can update own assessments" on public.assessments;
drop policy if exists "Users can delete own assessments" on public.assessments;

create policy "Users can select own assessments"
  on public.assessments for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own assessments"
  on public.assessments for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own assessments"
  on public.assessments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own assessments"
  on public.assessments for delete to authenticated
  using (auth.uid() = user_id);

create index idx_assessments_user on public.assessments(user_id, created_at desc);

-- ── 4. Remediation Tasks ──
create table public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  control_id   text,
  assessment_id text,
  priority     text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status       text not null default 'open' check (status in ('open','in_progress','completed','deferred')),
  assigned_to  text,
  due_date     text,
  ai_guidance  jsonb,
  comments     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

drop policy if exists "Users CRUD own tasks" on public.tasks;
drop policy if exists "Users can select own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can select own tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = user_id);

create index idx_tasks_user on public.tasks(user_id, created_at desc);

-- â”€â”€ 4b. Reports â”€â”€
create table if not exists public.reports (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  type        text,
  payload     jsonb not null default '{}'::jsonb,
  file_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.reports force row level security;

drop policy if exists "Users can select own reports" on public.reports;
drop policy if exists "Users can insert own reports" on public.reports;
drop policy if exists "Users can update own reports" on public.reports;
drop policy if exists "Users can delete own reports" on public.reports;

create policy "Users can select own reports"
  on public.reports for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own reports"
  on public.reports for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.reports for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_reports_user on public.reports(user_id, created_at desc);

-- ── 5. Storage Buckets ──
-- Create a bucket for uploaded policy files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'policy-files',
  'policy-files',
  false,
  10485760,  -- 10 MB
  array['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Bucket for assessment evidence files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-files',
  'evidence-files',
  false,
  10485760,  -- 10 MB
  array['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/gif','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

-- Storage policies: users can manage their own files
drop policy if exists "Users can upload policy files" on storage.objects;
drop policy if exists "Users can view own policy files" on storage.objects;
drop policy if exists "Users can delete own policy files" on storage.objects;

create policy "Users can upload policy files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own policy files"
  on storage.objects for select to authenticated
  using (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own policy files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Evidence files storage policies
drop policy if exists "Users can upload evidence files" on storage.objects;
drop policy if exists "Users can view own evidence files" on storage.objects;
drop policy if exists "Users can delete own evidence files" on storage.objects;

create policy "Users can upload evidence files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own evidence files"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own evidence files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 6. Updated_at triggers ──
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.policies
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.assessments
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute procedure public.update_updated_at();
drop trigger if exists set_updated_at on public.reports;
create trigger set_updated_at before update on public.reports
  for each row execute procedure public.update_updated_at();

-- ── Done! ──
-- After running this, create a .env file with:
--   VITE_SUPABASE_URL=https://your-project.supabase.co
--   VITE_SUPABASE_ANON_KEY=your-anon-key
--
-- Supabase Auth URL Configuration notes:
-- Add these URLs in Supabase Dashboard > Authentication > URL Configuration.
--
-- Local testing:
--   Site URL: http://localhost:5173
--   Redirect URLs:
--     http://localhost:5173
--     http://localhost:5173/auth/callback
--     http://localhost:5173/auth/reset-password
--     http://localhost:5173/*
--
-- Production:
--   Site URL: http://44.223.40.115
--   Redirect URLs:
--     http://44.223.40.115
--     http://44.223.40.115/auth/callback
--     http://44.223.40.115/auth/reset-password
--     http://44.223.40.115/*
--
-- Password reset is handled by Supabase Auth; no password-reset SQL is required.
