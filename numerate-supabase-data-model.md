# Numerate — Supabase Data Model (Revised)

## Context

Numerate is a mobile-first arithmetic training app using Supabase Auth. Users complete a placement assessment, then do daily timed training sessions. The app tracks performance metrics, XP, levels, streaks, and personal records.

**Current state of Supabase:**
- `profiles` table already exists with columns: `uuid`, `created_at`, `xp`, `levels`, `streak`
- RLS policies already created
- No `sessions` table yet in Supabase

This document defines the migration plan and final schema. The existing `profiles` table is migrated safely — it is NOT dropped.

---

## Part A — Revised Final Schema

### `profiles` table (final state after migration)

```sql
create table profiles (
  uuid                     uuid primary key references auth.users(id) on delete cascade,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Core progress
  level                    integer not null default 1,
  xp_into_level            integer not null default 0,
  lifetime_xp              integer not null default 0,
  streak                   integer not null default 0,
  last_streak_date         date,
  lifetime_questions       integer not null default 0,

  -- Onboarding
  has_completed_assessment boolean not null default false,
  starting_level           integer not null default 1,
  competence_group         integer not null default 1,

  -- Adaptive engine state (written at session completion, not per question)
  sr_global                real not null default 50,
  difficulty_step          integer not null default 0,
  good_streak_count        integer not null default 0,
  poor_streak_count        integer not null default 0,
  recent_history           jsonb not null default '[]',

  -- Personal records (JSONB in v1)
  personal_bests           jsonb not null default '{}',

  -- Game mode bests (JSONB in v1)
  quickfire_high_score     integer not null default 0,
  skill_drill_bests        jsonb not null default '{}',

  -- Coaching / onboarding
  seen_strategies          text[] not null default '{}',
  quickfire_intro_seen     boolean not null default false,

  -- Paywall
  has_used_free_daily      boolean not null default false,

  -- Check constraints
  constraint profiles_level_positive      check (level >= 1),
  constraint profiles_xp_into_level_nn   check (xp_into_level >= 0),
  constraint profiles_lifetime_xp_nn     check (lifetime_xp >= 0),
  constraint profiles_streak_nn          check (streak >= 0),
  constraint profiles_lifetime_q_nn      check (lifetime_questions >= 0),
  constraint profiles_sr_global_range    check (sr_global >= 0 and sr_global <= 100),
  constraint profiles_difficulty_step_range check (difficulty_step >= 0 and difficulty_step <= 4)
);
```

**Technical debt note:** The column is renamed from `levels` → `level` in the migration. If the rename is blocked for any reason, keep `levels` temporarily and add `level` as an alias — but document this as debt to clean up.

---

### `sessions` table (new)

One row per completed training session. This is the primary analytics table.

```sql
create table sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_uuid               uuid not null references profiles(uuid) on delete cascade,
  session_type            text not null
                            check (session_type in ('daily', 'rounding', 'doubling', 'halving', 'quickfire')),

  -- Timing
  started_at              timestamptz not null default now(),
  ended_at                timestamptz,

  -- Duration
  duration_mode           integer,              -- 60 | 120 | 180 | null (unlimited)
  duration_actual_seconds integer not null,

  -- Volume
  total_questions         integer not null,
  correct_questions       integer not null,

  -- Core performance metrics (stored, not derived)
  accuracy                real not null,
  median_response_ms      integer,
  variability_ms          real,
  questions_per_second    real,

  -- Composite scores
  speed_score             real,
  consistency_score       real,
  throughput_score        real,
  fluency_score           real,

  -- XP breakdown
  xp_earned               integer not null,
  xp_base                 integer,
  xp_multiplier           real,

  -- Level snapshot
  level_before            integer,
  level_after             integer,
  level_ups               integer not null default 0,

  -- In-session record
  best_streak_in_session  integer not null default 0,

  -- Check constraints
  constraint sessions_total_q_nn         check (total_questions >= 0),
  constraint sessions_correct_q_nn       check (correct_questions >= 0),
  constraint sessions_correct_lte_total  check (correct_questions <= total_questions),
  constraint sessions_accuracy_range     check (accuracy >= 0 and accuracy <= 1),
  constraint sessions_duration_positive  check (duration_actual_seconds > 0),
  constraint sessions_xp_nn              check (xp_earned >= 0),
  constraint sessions_ended_after_start  check (ended_at is null or ended_at >= started_at)
);
```

---

## Part B — SQL Migration Plan

Run these statements in order in the Supabase SQL Editor. Each step is safe to run independently.

### Step 1 — Rename `levels` → `level`

```sql
alter table profiles rename column levels to level;
```

### Step 2 — Rename `xp` → `lifetime_xp`

```sql
alter table profiles rename column xp to lifetime_xp;
```

### Step 3 — Add `xp_into_level`

```sql
alter table profiles add column if not exists xp_into_level integer default 0;
```

### Step 4 — Add `updated_at` column

```sql
alter table profiles add column if not exists updated_at timestamptz default now();
```

### Step 5 — Add remaining missing columns (all with safe defaults)

```sql
alter table profiles
  add column if not exists last_streak_date         date,
  add column if not exists lifetime_questions       integer default 0,
  add column if not exists has_completed_assessment boolean default false,
  add column if not exists starting_level           integer default 1,
  add column if not exists competence_group         integer default 1,
  add column if not exists sr_global                real default 50,
  add column if not exists difficulty_step          integer default 0,
  add column if not exists good_streak_count        integer default 0,
  add column if not exists poor_streak_count        integer default 0,
  add column if not exists recent_history           jsonb default '[]',
  add column if not exists personal_bests           jsonb default '{}',
  add column if not exists quickfire_high_score     integer default 0,
  add column if not exists skill_drill_bests        jsonb default '{}',
  add column if not exists seen_strategies          text[] default '{}',
  add column if not exists quickfire_intro_seen     boolean default false,
  add column if not exists has_used_free_daily      boolean default false;
```

### Step 6 — Backfill null values before adding NOT NULL constraints

```sql
update profiles set
  xp_into_level            = coalesce(xp_into_level, 0),
  lifetime_xp              = coalesce(lifetime_xp, 0),
  level                    = coalesce(level, 1),
  streak                   = coalesce(streak, 0),
  lifetime_questions       = coalesce(lifetime_questions, 0),
  has_completed_assessment = coalesce(has_completed_assessment, false),
  starting_level           = coalesce(starting_level, 1),
  competence_group         = coalesce(competence_group, 1),
  sr_global                = coalesce(sr_global, 50),
  difficulty_step          = coalesce(difficulty_step, 0),
  good_streak_count        = coalesce(good_streak_count, 0),
  poor_streak_count        = coalesce(poor_streak_count, 0),
  recent_history           = coalesce(recent_history, '[]'),
  personal_bests           = coalesce(personal_bests, '{}'),
  quickfire_high_score     = coalesce(quickfire_high_score, 0),
  skill_drill_bests        = coalesce(skill_drill_bests, '{}'),
  seen_strategies          = coalesce(seen_strategies, '{}'),
  quickfire_intro_seen     = coalesce(quickfire_intro_seen, false),
  has_used_free_daily      = coalesce(has_used_free_daily, false),
  updated_at               = coalesce(updated_at, created_at);
```

### Step 7 — Apply NOT NULL constraints

```sql
alter table profiles
  alter column xp_into_level            set not null,
  alter column lifetime_xp              set not null,
  alter column level                    set not null,
  alter column streak                   set not null,
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
```

### Step 8 — Add check constraints

```sql
alter table profiles
  add constraint profiles_level_positive        check (level >= 1),
  add constraint profiles_xp_into_level_nn      check (xp_into_level >= 0),
  add constraint profiles_lifetime_xp_nn        check (lifetime_xp >= 0),
  add constraint profiles_streak_nn             check (streak >= 0),
  add constraint profiles_lifetime_q_nn         check (lifetime_questions >= 0),
  add constraint profiles_sr_global_range       check (sr_global >= 0 and sr_global <= 100),
  add constraint profiles_difficulty_step_range check (difficulty_step >= 0 and difficulty_step <= 4);
```

### Step 9 — Auto-update `updated_at` via trigger

```sql
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();
```

### Step 10 — Create `sessions` table (new)

```sql
create table sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_uuid               uuid not null references profiles(uuid) on delete cascade,
  session_type            text not null
                            check (session_type in ('daily', 'rounding', 'doubling', 'halving', 'quickfire')),
  started_at              timestamptz not null default now(),
  ended_at                timestamptz,
  duration_mode           integer,
  duration_actual_seconds integer not null,
  total_questions         integer not null,
  correct_questions       integer not null,
  accuracy                real not null,
  median_response_ms      integer,
  variability_ms          real,
  questions_per_second    real,
  speed_score             real,
  consistency_score       real,
  throughput_score        real,
  fluency_score           real,
  xp_earned               integer not null,
  xp_base                 integer,
  xp_multiplier           real,
  level_before            integer,
  level_after             integer,
  level_ups               integer not null default 0,
  best_streak_in_session  integer not null default 0,

  constraint sessions_total_q_nn         check (total_questions >= 0),
  constraint sessions_correct_q_nn       check (correct_questions >= 0),
  constraint sessions_correct_lte_total  check (correct_questions <= total_questions),
  constraint sessions_accuracy_range     check (accuracy >= 0 and accuracy <= 1),
  constraint sessions_duration_positive  check (duration_actual_seconds > 0),
  constraint sessions_xp_nn              check (xp_earned >= 0),
  constraint sessions_ended_after_start  check (ended_at is null or ended_at >= started_at)
);
```

### Step 11 — Add RLS to sessions

```sql
alter table sessions enable row level security;

create policy "Users can read own sessions"
  on sessions for select using (auth.uid() = user_uuid);

create policy "Users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_uuid);
```

### Step 12 — Add indexes on sessions

```sql
-- Primary query: user's sessions ordered by time (Progress page, recap)
create index sessions_user_started
  on sessions (user_uuid, started_at desc);

-- Filtered by session type (daily-only analytics)
create index sessions_user_type_started
  on sessions (user_uuid, session_type, started_at desc);

-- Time-range queries without user filter (admin / aggregate use)
create index sessions_started_at
  on sessions (started_at desc);
```

---

## Part C — App Read / Write Flow

### Profile Creation (sign-up, after assessment)

Called once after Supabase sign-up succeeds and the assessment is complete. Uses `ignoreDuplicates: true` so it is safe to call on every sign-in without overwriting existing data.

```typescript
// Called after signUpWithEmail() succeeds
await supabase.from('profiles').upsert({
  uuid:                     user.id,
  level:                    startingLevel,
  xp_into_level:            0,
  lifetime_xp:              0,
  streak:                   0,
  lifetime_questions:       0,
  has_completed_assessment: true,
  starting_level:           startingLevel,
  competence_group:         competenceGroup,
  sr_global:                50,
  difficulty_step:          0,
  good_streak_count:        0,
  poor_streak_count:        0,
}, { onConflict: 'uuid', ignoreDuplicates: true });
```

---

### Profile Hydration (sign-in)

Called after `signInWithEmail()` succeeds. Fetches the full profile and hydrates the Zustand store.

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('uuid', user.id)
  .single();

// Hydrate Zustand store:
useStore.setState({
  level:                    profile.level,
  xpIntoLevel:              profile.xp_into_level,
  lifetimeXP:               profile.lifetime_xp,
  streakCount:              profile.streak,
  lastStreakDate:            profile.last_streak_date,
  lifetimeQuestionsAnswered: profile.lifetime_questions,
  hasCompletedAssessment:   profile.has_completed_assessment,
  startingLevel:            profile.starting_level,
  competenceGroup:          profile.competence_group,
  personalBests:            profile.personal_bests,
  seenStrategies:           profile.seen_strategies,
  quickFireIntroSeen:       profile.quickfire_intro_seen,
  quickFireHighScore:       profile.quickfire_high_score,
  skillDrillBests:          profile.skill_drill_bests,
  hasUsedFreeDaily:         profile.has_used_free_daily,
  // Adaptive engine state
  progression: {
    level:         profile.level,
    band:          Math.floor(profile.level / 10),
    srGlobal:      profile.sr_global,
    difficultyStep: profile.difficulty_step,
    goodStreak:    profile.good_streak_count,
    poorStreak:    profile.poor_streak_count,
    history:       profile.recent_history,
  }
});
```

---

### Session Completion Write Path

Called once when a training session ends. Two writes happen in sequence:

#### 1. Insert session row

```typescript
await supabase.from('sessions').insert({
  user_uuid:               user.id,
  session_type:            session.sessionType,       // 'daily' | 'rounding' etc.
  started_at:              session.startedAt,
  ended_at:                new Date().toISOString(),
  duration_mode:           session.durationMode,
  duration_actual_seconds: session.durationSecondsActual,
  total_questions:         session.totalQuestions,
  correct_questions:       session.correctQuestions,
  accuracy:                session.accuracy,
  median_response_ms:      session.medianMs,
  variability_ms:          session.variabilityMs,
  questions_per_second:    session.throughputQps,
  speed_score:             session.speedScore,
  consistency_score:       session.consistencyScore,
  throughput_score:        session.throughputScore,
  fluency_score:           session.fluencyScore,
  xp_earned:               session.xpEarned,
  xp_base:                 session.baseSessionXP,
  xp_multiplier:           session.modeMultiplier,
  level_before:            session.levelBefore,
  level_after:             session.levelAfter,
  level_ups:               session.levelUpCount ?? 0,
  best_streak_in_session:  session.bestStreak,
});
```

#### 2. Update profile snapshot (including adaptive engine state)

Adaptive engine state is written here — at session completion — not per question. This keeps write volume low in v1.

```typescript
const { progression } = useStore.getState();

await supabase.from('profiles').update({
  level:              session.levelAfter,
  xp_into_level:      currentXpIntoLevel,
  lifetime_xp:        newLifetimeXp,
  streak:             newStreak,
  last_streak_date:   today,
  lifetime_questions: newLifetimeQuestions,
  personal_bests:     updatedPersonalBests,
  // Adaptive engine state — written once at session end
  sr_global:          progression.srGlobal,
  difficulty_step:    progression.difficultyStep,
  good_streak_count:  progression.goodStreak,
  poor_streak_count:  progression.poorStreak,
  recent_history:     progression.history,
  // updated_at is handled automatically by the trigger
}).eq('uuid', user.id);
```

---

## Key Design Decisions Summary

| Decision | Rationale |
|---|---|
| Migrate, don't recreate profiles | Safe — existing rows and policies are preserved |
| `levels` renamed to `level` | Naming clarity; feasible as a simple column rename |
| `xp` split into `xp_into_level` + `lifetime_xp` | These are distinct concepts that serve different queries |
| Adaptive state written at session end only | Low write volume for v1; state is consistent at session boundaries |
| `ended_at` stored in sessions | More accurate than deriving from `started_at + duration`. Useful for admin queries |
| JSONB for personal bests / skill drill bests | Read/written atomically; no need to query individual fields. Revisit in v2 for leaderboards |
| `updated_at` via trigger | Eliminates application-level responsibility; always accurate |
| Sessions indexed on `(user_uuid, started_at desc)` | Matches the primary query pattern for the Progress page |
| Settings remain device-local | Prevents cross-device sync conflicts in v1 |

---

## V2 Additions (Do Not Build Now)

- `question_attempts` table (per-question raw latency + operation type)
- `entitlements` table (billing tier, expiry, transaction ID)
- `personal_bests` as a separate queryable table (for leaderboards)
- `game_mode_bests` table with `(user_uuid, game_type)` PK
- Settings sync to Supabase (multi-device)
- Per-question adaptive state writes (if real-time analysis is needed)
