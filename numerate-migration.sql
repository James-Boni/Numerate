-- ============================================================
-- Numerate — Supabase Migration
-- Run all steps in order. Safe to rerun.
-- ============================================================


-- Step 1: Rename levels -> level
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'levels'
  ) then
    alter table profiles rename column levels to level;
  end if;
end $$;


-- Step 2: Rename xp -> lifetime_xp
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'xp'
  ) then
    alter table profiles rename column xp to lifetime_xp;
  end if;
end $$;


-- Step 3: Add all missing columns
alter table profiles
  add column if not exists updated_at               timestamptz  default now(),
  add column if not exists xp_into_level            integer      default 0,
  add column if not exists last_streak_date         date,
  add column if not exists lifetime_questions       integer      default 0,
  add column if not exists has_completed_assessment boolean      default false,
  add column if not exists starting_level           integer      default 1,
  add column if not exists competence_group         integer      default 1,
  add column if not exists sr_global                real         default 50,
  add column if not exists difficulty_step          integer      default 0,
  add column if not exists good_streak_count        integer      default 0,
  add column if not exists poor_streak_count        integer      default 0,
  add column if not exists recent_history           jsonb        default '[]'::jsonb,
  add column if not exists personal_bests           jsonb        default '{}'::jsonb,
  add column if not exists quickfire_high_score     integer      default 0,
  add column if not exists skill_drill_bests        jsonb        default '{}'::jsonb,
  add column if not exists seen_strategies          text[]       default '{}',
  add column if not exists quickfire_intro_seen     boolean      default false,
  add column if not exists has_used_free_daily      boolean      default false;


-- Step 4: Backfill null values before NOT NULL constraints
update profiles set
  lifetime_xp              = coalesce(lifetime_xp,    0),
  level                    = coalesce(level,           1),
  streak                   = coalesce(streak,          0),
  xp_into_level            = coalesce(xp_into_level,  0),
  lifetime_questions       = coalesce(lifetime_questions, 0),
  has_completed_assessment = coalesce(has_completed_assessment, false),
  starting_level           = coalesce(starting_level,  1),
  competence_group         = coalesce(competence_group, 1),
  sr_global                = coalesce(sr_global,       50),
  difficulty_step          = coalesce(difficulty_step, 0),
  good_streak_count        = coalesce(good_streak_count, 0),
  poor_streak_count        = coalesce(poor_streak_count, 0),
  recent_history           = coalesce(recent_history,  '[]'::jsonb),
  personal_bests           = coalesce(personal_bests,  '{}'::jsonb),
  quickfire_high_score     = coalesce(quickfire_high_score, 0),
  skill_drill_bests        = coalesce(skill_drill_bests, '{}'::jsonb),
  seen_strategies          = coalesce(seen_strategies, '{}'),
  quickfire_intro_seen     = coalesce(quickfire_intro_seen, false),
  has_used_free_daily      = coalesce(has_used_free_daily, false),
  updated_at               = coalesce(updated_at, created_at);


-- Step 5: Apply NOT NULL constraints
alter table profiles
  alter column lifetime_xp              set not null,
  alter column level                    set not null,
  alter column streak                   set not null,
  alter column xp_into_level            set not null,
  alter column lifetime_questions       set not null,
  alter column has_completed_assessment set not null,
  alter column starting_level           set not null,
  alter column competence_group         set not null,
  alter column sr_global                set not null,
  alter column difficulty_step          set not null,
  alter column good_streak_count        set not null,
  alter column poor_streak_count        set not null,
  alter column recent_history           set not null,
  alter column personal_bests           set not null,
  alter column quickfire_high_score     set not null,
  alter column skill_drill_bests        set not null,
  alter column seen_strategies          set not null,
  alter column quickfire_intro_seen     set not null,
  alter column has_used_free_daily      set not null,
  alter column updated_at               set not null;


-- Step 6: Add check constraints (guarded — safe to rerun)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_level_positive' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_level_positive check (level >= 1);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_xp_into_level_nn' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_xp_into_level_nn check (xp_into_level >= 0);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_lifetime_xp_nn' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_lifetime_xp_nn check (lifetime_xp >= 0);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_streak_nn' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_streak_nn check (streak >= 0);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_lifetime_q_nn' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_lifetime_q_nn check (lifetime_questions >= 0);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sr_global_range' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_sr_global_range check (sr_global >= 0 and sr_global <= 100);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_difficulty_step_range' and conrelid = 'profiles'::regclass) then
    alter table profiles add constraint profiles_difficulty_step_range check (difficulty_step >= 0 and difficulty_step <= 4);
  end if;
end $$;


-- Step 7: Auto-update updated_at via trigger
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();


-- Step 8: Explicit RLS on profiles
-- The profiles table was created before this migration with RLS enabled.
-- These statements make the exact policies authoritative and idempotent.
-- Only SELECT, INSERT, UPDATE are allowed from the client.
-- No DELETE policy — profiles are not deletable from the client in v1.
alter table profiles enable row level security;

drop policy if exists "Users can read own profile"   on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = uuid);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = uuid);

create policy "Users can update own profile"
  on profiles for update
  using     (auth.uid() = uuid)
  with check (auth.uid() = uuid);


-- Step 9: Create sessions table
create table if not exists sessions (
  id                      uuid        primary key default gen_random_uuid(),
  user_uuid               uuid        not null references profiles(uuid) on delete cascade,
  session_type            text        not null
                            check (session_type in ('daily', 'rounding', 'doubling', 'halving', 'quickfire')),
  started_at              timestamptz not null default now(),
  ended_at                timestamptz,
  duration_mode           integer,
  duration_actual_seconds integer     not null,
  total_questions         integer     not null,
  correct_questions       integer     not null,
  accuracy                real        not null,
  median_response_ms      integer,
  variability_ms          real,
  questions_per_second    real,
  speed_score             real,
  consistency_score       real,
  throughput_score        real,
  fluency_score           real,
  xp_earned               integer     not null,
  xp_base                 integer,
  xp_multiplier           real,
  level_before            integer,
  level_after             integer,
  level_ups               integer     not null default 0,
  best_streak_in_session  integer     not null default 0,

  constraint sessions_total_q_nn        check (total_questions >= 0),
  constraint sessions_correct_q_nn      check (correct_questions >= 0),
  constraint sessions_correct_lte_total check (correct_questions <= total_questions),
  constraint sessions_accuracy_range    check (accuracy >= 0 and accuracy <= 1),
  constraint sessions_duration_positive check (duration_actual_seconds > 0),
  constraint sessions_xp_nn             check (xp_earned >= 0),
  constraint sessions_ended_after_start check (ended_at is null or ended_at >= started_at)
);


-- Step 9: RLS on sessions (insert and select only — sessions are immutable in v1)
alter table sessions enable row level security;

drop policy if exists "Users can read own sessions"   on sessions;
drop policy if exists "Users can insert own sessions" on sessions;

create policy "Users can read own sessions"
  on sessions for select using (auth.uid() = user_uuid);

create policy "Users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_uuid);


-- Step 10: Indexes on sessions
create index if not exists sessions_user_started
  on sessions (user_uuid, started_at desc);

create index if not exists sessions_user_type_started
  on sessions (user_uuid, session_type, started_at desc);

create index if not exists sessions_started_at
  on sessions (started_at desc);
