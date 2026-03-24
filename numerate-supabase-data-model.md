# Numerate — Supabase Data Model (Final, Implementation-Ready)

## Current State

- `profiles` table already exists in Supabase with: `uuid`, `created_at`, `xp`, `levels`, `streak`
- RLS policies already created on `profiles`
- No `sessions` table in Supabase yet
- `supabase-auth.ts` currently uses old column names: `levels`, `xp` — these must be updated before the migration runs

---

## Part A — Final SQL Migration

All statements are safe to rerun in the Supabase SQL Editor. Idempotent where PostgreSQL allows.

---

### Step 1 — Rename `levels` → `level`

```sql
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'levels'
  ) then
    alter table profiles rename column levels to level;
  end if;
end $$;
```

---

### Step 2 — Rename `xp` → `lifetime_xp`

```sql
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'xp'
  ) then
    alter table profiles rename column xp to lifetime_xp;
  end if;
end $$;
```

---

### Step 3 — Add all missing columns (safe, idempotent)

```sql
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
```

---

### Step 4 — Backfill null values before adding NOT NULL constraints

```sql
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
```

---

### Step 5 — Apply NOT NULL constraints

```sql
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
```

---

### Step 6 — Add check constraints (idempotent)

```sql
alter table profiles
  add constraint if not exists profiles_level_positive
    check (level >= 1),
  add constraint if not exists profiles_xp_into_level_nn
    check (xp_into_level >= 0),
  add constraint if not exists profiles_lifetime_xp_nn
    check (lifetime_xp >= 0),
  add constraint if not exists profiles_streak_nn
    check (streak >= 0),
  add constraint if not exists profiles_lifetime_q_nn
    check (lifetime_questions >= 0),
  add constraint if not exists profiles_sr_global_range
    check (sr_global >= 0 and sr_global <= 100),
  add constraint if not exists profiles_difficulty_step_range
    check (difficulty_step >= 0 and difficulty_step <= 4);
```

---

### Step 7 — Auto-update `updated_at` via trigger

```sql
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();
```

---

### Step 8 — Create `sessions` table

```sql
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
```

---

### Step 9 — RLS on sessions (insert and select only — sessions are immutable in v1)

```sql
alter table sessions enable row level security;

drop policy if exists "Users can read own sessions"   on sessions;
drop policy if exists "Users can insert own sessions" on sessions;

create policy "Users can read own sessions"
  on sessions for select using (auth.uid() = user_uuid);

create policy "Users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_uuid);
```

No update or delete policies. Sessions are append-only in v1.

---

### Step 10 — Indexes on sessions

```sql
create index if not exists sessions_user_started
  on sessions (user_uuid, started_at desc);

create index if not exists sessions_user_type_started
  on sessions (user_uuid, session_type, started_at desc);

create index if not exists sessions_started_at
  on sessions (started_at desc);
```

---

## Part B — App Implementation Order

**Do not run the SQL migration until step 3 is complete.**

### Step 1 — Update `supabase-auth.ts` (column name fixes + function split)

The current `ensureProfile` uses old column names (`levels`, `xp`) and is called on both sign-up and sign-in paths. Split it into two functions:

**`ensureProfile(userId, startingLevel, competenceGroup)`** — onboarding path only.
Called after sign-up succeeds and the assessment is complete. Requires placement context. Creates the full profile row.

```typescript
// client/src/lib/supabase-auth.ts
export async function ensureProfile(
  userId: string,
  startingLevel: number,
  competenceGroup: number
): Promise<ProfileResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        uuid:                     userId,
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
      },
      { onConflict: 'uuid', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[ensureProfile] Failed:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}
```

**`ensureProfileExists(userId)`** — sign-in safety path only.
Called after sign-in succeeds. Does not write onboarding context (it is already set from when the account was created). Only creates a minimal fallback row if, for some reason, no profile row exists. Silent on conflict.

```typescript
export async function ensureProfileExists(userId: string): Promise<ProfileResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured' }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { uuid: userId },
      { onConflict: 'uuid', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[ensureProfileExists] Failed:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}
```

---

### Step 2 — Update `AuthScreen.tsx` (use correct function per path)

- **Sign-up path**: call `ensureProfile(user.id, startingLevel, competenceGroup)` (requires assessment context — `startingLevel > 0` is already the gate)
- **Sign-in path**: call `ensureProfileExists(user.id)` (no assessment context needed)

The `competenceGroup` value is already stored in Zustand after assessment completes (`useStore(s => s.competenceGroup)`).

---

### Step 3 — Run the SQL migration in Supabase

Run Part A steps 1–10 in order in the Supabase SQL Editor. All steps are safe to rerun.

After running:
- Verify the `profiles` table has the new columns
- Verify the `sessions` table exists
- Verify RLS is active on both tables
- Verify the trigger exists: `select * from information_schema.triggers where trigger_name = 'profiles_updated_at';`

---

### Step 4 — Test the full flow

1. Clear localStorage in the browser (resets Zustand state)
2. Go through full onboarding: Welcome → Assessment → Results → `/auth`
3. Sign up — verify profile row is created in Supabase with correct `level`, `xp_into_level`, `starting_level`
4. Sign out — verify redirect to `/auth?mode=signin`
5. Sign in — verify profile is loaded and Zustand state is hydrated
6. Complete a training session — verify a row appears in `sessions` and `profiles.updated_at` changes

---

## Part C — Files That Need Updating

| File | What Changes |
|---|---|
| `client/src/lib/supabase-auth.ts` | Replace `ensureProfile` with the two-function split above. Update column names: `levels` → `level`, `xp` → `lifetime_xp`, add `xp_into_level` |
| `client/src/pages/AuthScreen.tsx` | Sign-up path: pass `competenceGroup` to `ensureProfile`. Sign-in path: call `ensureProfileExists` instead |
| `client/src/lib/store.ts` or a new `supabase-sync.ts` | Add profile hydration on sign-in (`loadProfileFromSupabase`) and session write (`saveSessionToSupabase`) |

**No other files need changes for the migration itself.** The store's internal field names (`xpIntoLevel`, `lifetimeXP`, `level`) already match the intended Supabase schema — only the Supabase write/read mapping layer needs updating.

---

## Profile Hydration on Sign-In (reference implementation)

After `signInWithEmail` succeeds, fetch and hydrate:

```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('uuid', user.id)
  .single()

if (profile) {
  useStore.setState({
    level:                     profile.level,
    xpIntoLevel:               profile.xp_into_level,
    lifetimeXP:                profile.lifetime_xp,
    streakCount:               profile.streak,
    lastStreakDate:             profile.last_streak_date,
    lifetimeQuestionsAnswered: profile.lifetime_questions,
    hasCompletedAssessment:    profile.has_completed_assessment,
    startingLevel:             profile.starting_level,
    competenceGroup:           profile.competence_group,
    personalBests:             profile.personal_bests,
    seenStrategies:            profile.seen_strategies,
    quickFireIntroSeen:        profile.quickfire_intro_seen,
    quickFireHighScore:        profile.quickfire_high_score,
    skillDrillBests:           profile.skill_drill_bests,
    hasUsedFreeDaily:          profile.has_used_free_daily,
    progression: {
      level:          profile.level,
      band:           Math.floor(profile.level / 10),
      srGlobal:       profile.sr_global,
      difficultyStep: profile.difficulty_step,
      goodStreak:     profile.good_streak_count,
      poorStreak:     profile.poor_streak_count,
      history:        profile.recent_history,
    }
  })
}
```

---

## Session Completion Write (reference implementation)

Two writes at session end. Adaptive engine state is written here — not per question.

```typescript
// 1. Insert session row
await supabase.from('sessions').insert({
  user_uuid:               user.id,
  session_type:            session.sessionType,
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
})

// 2. Update profile snapshot (includes adaptive engine state)
const { progression } = useStore.getState()

await supabase.from('profiles').update({
  level:              session.levelAfter,
  xp_into_level:      currentXpIntoLevel,
  lifetime_xp:        newLifetimeXp,
  streak:             newStreak,
  last_streak_date:   todayISODate,
  lifetime_questions: newLifetimeQuestions,
  personal_bests:     updatedPersonalBests,
  sr_global:          progression.srGlobal,
  difficulty_step:    progression.difficultyStep,
  good_streak_count:  progression.goodStreak,
  poor_streak_count:  progression.poorStreak,
  recent_history:     progression.history,
  // updated_at is set automatically by the trigger
}).eq('uuid', user.id)
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Migrate with ALTER, not DROP/RECREATE | Existing rows and policies are preserved; zero data loss |
| `levels` renamed to `level` | Idempotent rename inside a DO block; safe to rerun |
| `xp` renamed to `lifetime_xp`, `xp_into_level` added | Two distinct concepts; wrong to conflate |
| jsonb defaults use explicit `::jsonb` cast | Required for correctness in PostgreSQL; avoids text/jsonb type ambiguity |
| Adaptive state written at session end | Low write volume in v1; state is consistent at session boundaries |
| Sessions are insert-only (no update/delete RLS) | Immutable audit trail; prevents accidental overwrite |
| `ensureProfile` vs `ensureProfileExists` split | Onboarding requires placement context; sign-in safety does not |
| App code updated before migration runs | Prevents column-name mismatch during the transition window |
| `create index if not exists` | Safe to rerun without error |
| `add constraint if not exists` | Safe to rerun without error (PostgreSQL 12+, Supabase uses 15) |
| `create or replace trigger` | Idempotent trigger definition |
