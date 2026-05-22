-- =============================================================================
-- DreamDiary — Supabase Database Schema
-- =============================================================================
-- Run this against a fresh Supabase project.
-- Assumes the built-in auth.users table already exists (Supabase default).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUM types
-- -----------------------------------------------------------------------------
-- Tag type: either a dream symbol or an emotion tag
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_type') then
    create type tag_type as enum ('symbol', 'emotion');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Table: public.users
-- Extends Supabase auth.users with application-level profile data.
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id              uuid        not null references auth.users(id) on delete cascade,
  email           text        not null,
  name            text,
  avatar_url      text,
  -- Local time at which the user typically wakes (used for notification scheduling)
  wake_time       time        not null default '07:00:00',
  -- Premium subscription status (also managed via RevenueCat webhooks)
  is_premium      boolean     not null default false,
  -- ISO 639-1 language code preference for AI responses
  language        text        not null default 'en',
  -- Onboarding completion flag
  onboarding_done boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint users_pkey primary key (id)
);

comment on table public.users is
  'Application-level user profile, extending Supabase auth.users.';

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Table: public.dreams
-- One row per recorded dream.
-- -----------------------------------------------------------------------------
create table if not exists public.dreams (
  id               uuid        not null default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  -- Supabase Storage path to the audio recording (nullable if text-only entry)
  audio_url        text,
  -- Raw transcript from Whisper or manual entry
  transcript       text,
  -- One-sentence AI summary from GPT-4o
  ai_summary       text,
  -- 1-10 scale determined by GPT-4o
  vividness_score  integer     check (vividness_score between 1 and 10),
  -- Optional user-supplied title (can be AI-generated)
  title            text,
  -- Whether the user has marked this dream as a favourite
  is_favourite     boolean     not null default false,
  -- When the dream was actually experienced (user's sleep session)
  recorded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint dreams_pkey primary key (id)
);

comment on table public.dreams is
  'Dream journal entries: audio recording, transcript, and AI analysis.';

drop trigger if exists dreams_updated_at on public.dreams;
create trigger dreams_updated_at
  before update on public.dreams
  for each row execute function public.set_updated_at();

-- Index for the common query pattern: fetch all dreams for a user ordered newest-first
create index if not exists dreams_user_id_recorded_at_idx
  on public.dreams (user_id, recorded_at desc);

-- -----------------------------------------------------------------------------
-- Table: public.dream_tags
-- Symbols and emotions extracted by GPT-4o for each dream.
-- -----------------------------------------------------------------------------
create table if not exists public.dream_tags (
  id               uuid           not null default gen_random_uuid(),
  dream_id         uuid           not null references public.dreams(id) on delete cascade,
  -- 'symbol' or 'emotion'
  type             text           not null check (type in ('symbol', 'emotion')),
  -- Human-readable label, e.g. "flying", "joy", "water"
  label            text           not null,
  -- GPT confidence 0.00–1.00
  confidence_score numeric(3, 2)  check (confidence_score between 0 and 1),
  created_at       timestamptz    not null default now(),

  constraint dream_tags_pkey primary key (id)
);

comment on table public.dream_tags is
  'Symbol and emotion tags extracted from dreams by the AI pipeline.';

create index if not exists dream_tags_dream_id_idx
  on public.dream_tags (dream_id);

create index if not exists dream_tags_user_label_idx
  on public.dream_tags (label, type);

-- -----------------------------------------------------------------------------
-- Table: public.patterns
-- Recurring themes / patterns detected across multiple dreams.
-- -----------------------------------------------------------------------------
create table if not exists public.patterns (
  id               uuid        not null default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  -- Narrative description of the detected pattern
  pattern_text     text        not null,
  -- Array of symbol labels that contributed to this pattern
  symbols_involved text[]      not null default '{}',
  -- Time window this pattern covers (optional, for UI display)
  window_start     timestamptz,
  window_end       timestamptz,
  generated_at     timestamptz not null default now(),

  constraint patterns_pkey primary key (id)
);

comment on table public.patterns is
  'AI-generated recurring dream patterns aggregated across a user''s dream history.';

create index if not exists patterns_user_id_generated_at_idx
  on public.patterns (user_id, generated_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Every table is protected: users can only access their own data.
-- -----------------------------------------------------------------------------

alter table public.users        enable row level security;
alter table public.dreams       enable row level security;
alter table public.dream_tags   enable row level security;
alter table public.patterns     enable row level security;

-- users -----------------------------------------------------------------------
drop policy if exists "Users own data" on public.users;
create policy "Users own data"
  on public.users
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- dreams ----------------------------------------------------------------------
drop policy if exists "Users own dreams" on public.dreams;
create policy "Users own dreams"
  on public.dreams
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- dream_tags ------------------------------------------------------------------
-- Tags are readable/writable only when the parent dream belongs to the user.
drop policy if exists "Users own tags" on public.dream_tags;
create policy "Users own tags"
  on public.dream_tags
  for all
  using (
    dream_id in (
      select id from public.dreams where user_id = auth.uid()
    )
  )
  with check (
    dream_id in (
      select id from public.dreams where user_id = auth.uid()
    )
  );

-- patterns --------------------------------------------------------------------
drop policy if exists "Users own patterns" on public.patterns;
create policy "Users own patterns"
  on public.patterns
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Supabase Storage bucket (run manually or via Supabase dashboard)
-- -----------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public)
-- values ('dream-audio', 'dream-audio', false)
-- on conflict do nothing;
--
-- create policy "Users upload own audio"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'dream-audio' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "Users read own audio"
--   on storage.objects for select
--   using (
--     bucket_id = 'dream-audio' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "Users delete own audio"
--   on storage.objects for delete
--   using (
--     bucket_id = 'dream-audio' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- =============================================================================
-- End of schema
-- =============================================================================
