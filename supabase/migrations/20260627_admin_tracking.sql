-- ============================================================================
-- DreamDiary Admin: Cost & Revenue Tracking Tables
-- Run this in your Supabase SQL editor (or via supabase db push)
-- ============================================================================

-- API usage logs — auto-populated by the mobile app on each AI call
create table if not exists public.api_usage_logs (
  id                   uuid primary key default gen_random_uuid(),
  service              text not null,              -- 'whisper' | 'gpt-4o' | 'gemini-flash' | 'claude-sonnet'
  model                text,
  user_id              uuid references auth.users(id) on delete set null,
  dream_id             uuid,
  tokens_in            integer,
  tokens_out           integer,
  audio_duration_secs  numeric(10, 3),
  cost_usd             numeric(12, 6) not null default 0,
  metadata             jsonb,
  created_at           timestamptz not null default now()
);

create index if not exists api_usage_logs_created_at_idx on public.api_usage_logs (created_at desc);
create index if not exists api_usage_logs_service_idx    on public.api_usage_logs (service);
create index if not exists api_usage_logs_user_id_idx    on public.api_usage_logs (user_id);

-- Row-level security: authenticated users can insert their own rows; admin reads all via service role
alter table public.api_usage_logs enable row level security;

create policy "users can insert own api logs"
  on public.api_usage_logs for insert
  with check (auth.uid() = user_id or user_id is null);

-- No select policy for anon/users — admin dashboard uses service role key which bypasses RLS

-- ============================================================================
-- Manual expenses (Supabase bill, Expo, Apple Developer, etc.)
-- ============================================================================

create table if not exists public.manual_expenses (
  id            uuid primary key default gen_random_uuid(),
  service       text not null,
  amount_usd    numeric(10, 2) not null,
  period_month  date not null,   -- first day of the billing month, e.g. 2026-06-01
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.manual_expenses enable row level security;
-- Only service role (admin dashboard) can read/write — no user-facing policies needed

-- ============================================================================
-- Subscription payments
-- ============================================================================

create table if not exists public.subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  amount_usd      numeric(10, 2) not null,
  currency        text not null default 'USD',
  plan            text not null default 'premium',
  payment_date    date not null,
  source          text not null default 'manual',  -- 'manual' | 'revenuecat' | 'stripe'
  transaction_id  text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists sub_payments_date_idx on public.subscription_payments (payment_date desc);

alter table public.subscription_payments enable row level security;
-- Admin only via service role
