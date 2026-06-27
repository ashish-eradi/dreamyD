-- ============================================================================
-- Admin: User Management + App Health extra columns/tables
-- ============================================================================

-- Extend user profiles
alter table public.users
  add column if not exists is_banned   boolean default false,
  add column if not exists language    text,
  add column if not exists plan_type   text default 'free';  -- 'free' | 'monthly' | 'quarterly' | 'annual'

-- Failed AI jobs queue
create table if not exists public.failed_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_type      text not null,       -- 'transcription' | 'analysis' | 'tagging'
  user_id       uuid references auth.users(id) on delete set null,
  dream_id      uuid,
  error_message text,
  payload       jsonb,
  status        text default 'failed',  -- 'failed' | 'retrying' | 'resolved'
  retry_count   integer default 0,
  created_at    timestamptz not null default now()
);

create index if not exists failed_jobs_status_idx     on public.failed_jobs (status);
create index if not exists failed_jobs_created_at_idx on public.failed_jobs (created_at desc);

alter table public.failed_jobs enable row level security;
-- Admin-only via service role key

-- User support notes (internal, never shown to users)
create table if not exists public.user_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

alter table public.user_notes enable row level security;
