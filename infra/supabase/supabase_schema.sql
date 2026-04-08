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

create policy "Users CRUD own policies"
  on public.policies for all using (auth.uid() = user_id);

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

create policy "Users CRUD own assessments"
  on public.assessments for all using (auth.uid() = user_id);

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

create policy "Users CRUD own tasks"
  on public.tasks for all using (auth.uid() = user_id);

create index idx_tasks_user on public.tasks(user_id, created_at desc);

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
create policy "Users can upload policy files"
  on storage.objects for insert
  with check (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own policy files"
  on storage.objects for select
  using (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own policy files"
  on storage.objects for delete
  using (bucket_id = 'policy-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Evidence files storage policies
create policy "Users can upload evidence files"
  on storage.objects for insert
  with check (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own evidence files"
  on storage.objects for select
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own evidence files"
  on storage.objects for delete
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

-- ── Done! ──
-- After running this, create a .env file with:
--   VITE_SUPABASE_URL=https://your-project.supabase.co
--   VITE_SUPABASE_ANON_KEY=your-anon-key
