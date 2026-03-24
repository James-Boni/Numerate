# Numerate — Supabase Data Model Design

## Context

Numerate is a mobile-first arithmetic training app. Users complete a placement assessment, then do daily timed training sessions. The app tracks performance metrics, XP, levels, streaks, and personal records. This document defines the full data model for migrating user metrics to Supabase.

The app currently uses:
- Supabase Auth (email/password, Apple Sign-In planned)
- A `profiles` table already exists in Supabase with: `uuid`, `xp`, `levels`, `streak`
- A legacy Express/PostgreSQL backend (to be replaced by Supabase)
- Zustand (client-side state, persisted to localStorage)

---

## Section 1 — All Data Points, Grouped by Category

### A. Core Profile (persistent account state)

| Field | Type | Stored/Derived | Updates | Notes |
|---|---|---|---|---|
| `levels` | integer | Stored | Per session (on level-up) | Current level (1–100+) |
| `xp_into_level` | integer | Stored | Per session | XP progress within current level |
| `lifetime_xp` | integer | Stored | Per session | Cumulative XP across all time |
| `streak` | integer | Stored | Per day | Daily training streak count |
| `last_streak_date` | date | Stored | Per session | Date of last completed session, used to decide if streak continues |
| `lifetime_questions` | integer | Stored | Per session | Total questions answered across all session types |
| `starting_level` | integer | Stored | Once (assessment) | Level placed at on initial assessment |
| `competence_group` | integer | Stored | Once (assessment) | Placement group 1–10 from assessment |
| `has_completed_assessment` | boolean | Stored | Once | Onboarding gate |
| `created_at` | timestamptz | Stored | Once | Account creation timestamp |
| `updated_at` | timestamptz | Stored | Per write | Row freshness |

---

### B. Adaptive Engine State (runtime, persisted for session continuity)

The app uses a real-time difficulty adaptation system. These fields are required to resume adaptation correctly after a user closes and reopens the app.

| Field | Type | Stored/Derived | Updates | Notes |
|---|---|---|---|---|
| `sr_global` | float | Stored | Per question | Skill rating 0–100. Drives difficulty adaptation |
| `difficulty_step` | integer | Stored | Per question | Fine-tuning within a level plateau (0–4) |
| `good_streak_count` | integer | Stored | Per question | Consecutive good-performance answers (anti-whiplash) |
| `poor_streak_count` | integer | Stored | Per question | Consecutive poor-performance answers (anti-whiplash) |
| `recent_history` | jsonb | Stored | Per question | Rolling window of last 20 answers. Each entry: `{ correct, timeMs, templateId, ps }`. Required for skill rating computation |
| `band` | integer | **Derived** | — | Always `floor(level / 10)`. Never stored; computed from `levels` |

---

### C. Session-Level Data (one row per completed session)

| Field | Type | Stored/Derived | Notes |
|---|---|---|---|
| `session_type` | text | Stored | `daily`, `rounding`, `doubling`, `halving`, `quickfire` |
| `started_at` | timestamptz | Stored | Session start time |
| `duration_mode` | integer | Stored | Requested duration: 60, 120, 180, or null (unlimited) |
| `duration_actual_seconds` | integer | Stored | Wall-clock seconds elapsed |
| `total_questions` | integer | Stored | Questions presented |
| `correct_questions` | integer | Stored | Correct answers |
| `accuracy` | float | Stored | `correct / total`. Stored to avoid division at query time |
| `median_response_ms` | integer | Stored | Median answer latency. Not re-derivable without raw per-question times |
| `variability_ms` | float | Stored | IQR of response times — measures consistency |
| `questions_per_second` | float | Stored | Throughput rate |
| `speed_score` | float | Stored | Normalised speed metric (0–1) |
| `consistency_score` | float | Stored | Normalised consistency metric (0–1) |
| `throughput_score` | float | Stored | Normalised throughput metric (0–1) |
| `fluency_score` | float | Stored | Composite fluency (weighted combination of above). Expensive to recompute; stored |
| `xp_earned` | integer | Stored | Total XP awarded this session |
| `xp_base` | integer | Stored | Pre-multiplier XP |
| `xp_multiplier` | float | Stored | Combined multipliers applied |
| `level_before` | integer | Stored | Level at session start |
| `level_after` | integer | Stored | Level at session end |
| `level_ups` | integer | Stored | How many level-ups occurred |
| `best_streak_in_session` | integer | Stored | Longest correct streak within this session |

**Not stored in v1 (deferred):**
- Individual answer latencies per question (would require a `question_attempts` table — see v2 section)
- Per-question operation type breakdown

---

### D. Personal Records / Lifetime Bests

| Field | Type | Notes |
|---|---|---|
| `best_streak` | integer | Lifetime longest correct streak |
| `best_streak_date` | date | When it was set |
| `fastest_median_ms` | integer | Lowest ever median response time |
| `fastest_median_date` | date | When it was set |
| `highest_accuracy` | float | Best single-session accuracy |
| `highest_accuracy_date` | date | When it was set |
| `highest_throughput` | float | Best QPS in a single session |
| `highest_throughput_date` | date | When it was set |
| `highest_fluency_score` | float | Best composite fluency score |
| `highest_fluency_date` | date | When it was set |

Stored as a single JSONB block (`personal_bests`) in `profiles` for v1. A separate table only becomes necessary when cross-user queries (leaderboards) are needed — v2.

---

### E. Game Mode Bests (skill drills + Quick Fire)

| Field | Type | Notes |
|---|---|---|
| `quickfire_high_score` | integer | Highest level reached in Quick Fire mode |
| `skill_drill_bests` | jsonb | Per-mode record for rounding, doubling, halving. Each: `{ bestScore, bestStreak, gamesPlayed, totalCorrect }` |

Stored as JSONB in `profiles` for v1. In v2, a `game_mode_bests` table with `(user_uuid, game_type)` primary key would be cleaner.

---

### F. Coaching & Onboarding State

| Field | Type | Notes |
|---|---|---|
| `seen_strategies` | text[] | Array of coaching strategy IDs already shown to user (prevents repeats) |
| `quickfire_intro_seen` | boolean | Whether the Quick Fire tutorial modal has been shown |

---

### G. Paywall / Entitlement State

| Field | Type | Notes |
|---|---|---|
| `has_used_free_daily` | boolean | Whether the free daily trial session has been consumed |
| Entitlement columns | various | **Defer to v2** — belongs in a separate `entitlements` table once billing is live |

---

### H. Settings (device-local — NOT Supabase in v1)

`sound_on`, `haptics_on`, `difficulty_preference`, `notifications_enabled`, `notification_time`, `show_debug_overlay`

These are device preferences. Storing them in Supabase creates sync conflicts across devices. Keep in Zustand/localStorage for v1. Revisit in v2 if multi-device sync is needed.

---

## Section 2 — Derived vs Stored Summary

| Data Point | Decision | Reason |
|---|---|---|
| `accuracy` | Store | Queried constantly; trivial to store at write time |
| `band` | Derive | Always `floor(level / 10)` — never out of sync |
| `fluency_score` | Store | Composite of 4 sub-scores; expensive to recompute |
| `median_response_ms` | Store | Requires raw latencies to recompute, which are not stored |
| `questions_per_second` | Store | Useful for Progress page without recompute overhead |
| 7-day rolling averages | Derive at query time | `AVG(accuracy) WHERE started_at > now() - interval '7 days'` |
| 30-day rolling averages | Derive at query time | Same pattern |
| Total session count | Derive at query time | `COUNT(*)` on sessions table |

---

## Section 3 — Proposed Supabase Schema

### `profiles` table

This is the current-state snapshot for each user. It does NOT store history. All analytical/historical queries go through the `sessions` table.

```sql
create table profiles (
  uuid                     uuid primary key references auth.users(id) on delete cascade,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Core progress
  levels                   integer not null default 1,
  xp_into_level            integer not null default 0,
  lifetime_xp              integer not null default 0,
  streak                   integer not null default 0,
  last_streak_date         date,
  lifetime_questions       integer not null default 0,

  -- Onboarding
  has_completed_assessment boolean not null default false,
  starting_level           integer not null default 1,
  competence_group         integer not null default 1,

  -- Adaptive engine state
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
  has_used_free_daily      boolean not null default false
);

-- RLS
alter table profiles enable row level security;
create policy "Users can read own profile"   on profiles for select using (auth.uid() = uuid);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = uuid);
create policy "Users can update own profile" on profiles for update using (auth.uid() = uuid);
```

---

### `sessions` table

One row per completed training session. This IS the analytics table. All trend queries, Progress page data, and historical charts come from here.

```sql
create table sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_uuid               uuid not null references profiles(uuid) on delete cascade,
  session_type            text not null,        -- daily | rounding | doubling | halving | quickfire
  started_at              timestamptz not null default now(),

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
  best_streak_in_session  integer not null default 0
);

-- RLS
alter table sessions enable row level security;
create policy "Users can read own sessions"   on sessions for select using (auth.uid() = user_uuid);
create policy "Users can insert own sessions" on sessions for insert with check (auth.uid() = user_uuid);
```

---

## Section 4 — V1 Required vs Deferred

### Required for v1

- Full `profiles` table as above
- Full `sessions` table as above
- RLS policies on both tables

### Defer to v2

| What | Why defer |
|---|---|
| `question_attempts` table (per-question raw data: latency, operation type, answer given) | High write volume, requires careful indexing. Adds depth but not needed for MVP analytics |
| `entitlements` table | Billing not live yet |
| `personal_bests` as its own table | JSONB in `profiles` is sufficient until cross-user leaderboard queries are needed |
| `game_mode_bests` as its own table | JSONB is fine until game mode variety increases |
| `seen_strategies` as its own table | `text[]` is fine until the strategy library is large and queryable independently |
| Settings sync to Supabase | Device-local is correct for v1; multi-device sync is a v2 concern |
| Notification preferences | Device-local only |

---

## Section 5 — Key Example Queries

**7-day accuracy trend (Progress page):**
```sql
select date_trunc('day', started_at) as day, avg(accuracy)
from sessions
where user_uuid = $1
  and session_type = 'daily'
  and started_at > now() - interval '7 days'
group by day
order by day;
```

**Level journey (all-time):**
```sql
select started_at, level_before, level_after, level_ups
from sessions
where user_uuid = $1
order by started_at asc;
```

**Personal best check after a session:**
```sql
select max(fluency_score), max(accuracy), min(median_response_ms)
from sessions
where user_uuid = $1
  and session_type = 'daily';
```

---

## Implementation Notes for the Developer

1. The existing `profiles` table in Supabase needs to be **dropped and recreated** with the full schema above (the current one only has `uuid`, `xp`, `levels`, `streak`).
2. The `sessions` table needs to be created fresh in Supabase. It does not exist there yet.
3. The app currently writes sessions to a legacy Express/PostgreSQL backend. That write path needs to be redirected to call `supabase.from('sessions').insert(...)` after a session completes.
4. After successful Supabase auth sign-in, the app should call `supabase.from('profiles').select('*').eq('uuid', user.id).single()` and hydrate the Zustand store with the returned values.
5. After each session, the app should write to both `sessions` (new row) and `profiles` (update current state fields: `levels`, `lifetime_xp`, `streak`, `lifetime_questions`, etc.).
6. `ensureProfile` (already implemented) uses `ignoreDuplicates: true` — this must be updated to insert the full profile row shape, not just the 4 fields currently used.
