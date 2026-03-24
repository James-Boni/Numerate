import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupabaseSessionRow {
  session_type: string
  started_at: string
  ended_at: string
  duration_mode: number | null
  duration_actual_seconds: number
  total_questions: number
  correct_questions: number
  accuracy: number
  median_response_ms: number | null
  variability_ms: number | null
  questions_per_second: number | null
  speed_score: number | null
  consistency_score: number | null
  throughput_score: number | null
  fluency_score: number | null
  xp_earned: number
  xp_base: number | null
  xp_multiplier: number | null
  level_before: number | null
  level_after: number | null
  level_ups: number
  best_streak_in_session: number
}

export interface SupabaseProfileUpdate {
  level: number
  xp_into_level: number
  lifetime_xp: number
  streak: number
  last_streak_date: string | null
  lifetime_questions: number
  personal_bests: object
  sr_global: number
  difficulty_step: number
  good_streak_count: number
  poor_streak_count: number
  recent_history: unknown[]
}

// ---------------------------------------------------------------------------
// loadProfileFromSupabase
// ---------------------------------------------------------------------------

export async function loadProfileFromSupabase(userId: string) {
  if (!supabase) {
    console.warn('[loadProfileFromSupabase] Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('uuid', userId)
    .single()

  if (error || !data) {
    console.error('[loadProfileFromSupabase]', error?.message ?? 'Profile not found')
    return null
  }

  return {
    level:                     data.level          ?? 1,
    xpIntoLevel:               data.xp_into_level  ?? 0,
    lifetimeXP:                data.lifetime_xp    ?? 0,
    streakCount:               data.streak         ?? 0,
    lastStreakDate:             data.last_streak_date ?? null,
    lifetimeQuestionsAnswered: data.lifetime_questions ?? 0,
    hasCompletedAssessment:    data.has_completed_assessment ?? false,
    startingLevel:             data.starting_level ?? 1,
    competenceGroup:           data.competence_group ?? 1,
    personalBests:             data.personal_bests ?? {
      bestStreak: 0,
      bestStreakDate: null,
      fastestMedianMs: null,
      fastestMedianDate: null,
      highestAccuracy: null,
      highestAccuracyDate: null,
      highestThroughput: null,
      highestThroughputDate: null,
      highestFluencyScore: null,
      highestFluencyDate: null,
    },
    seenStrategies:            data.seen_strategies     ?? [],
    quickFireIntroSeen:        data.quickfire_intro_seen ?? false,
    quickFireHighScore:        data.quickfire_high_score ?? 0,
    skillDrillBests:           data.skill_drill_bests   ?? {
      rounding: { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
      doubling: { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
      halving:  { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
    },
    hasUsedFreeDaily: data.has_used_free_daily ?? false,
    progression: {
      level:          data.level          ?? 1,
      band:           Math.floor((data.level ?? 1) / 10),
      srGlobal:       data.sr_global       ?? 50,
      difficultyStep: data.difficulty_step  ?? 0,
      goodStreak:     data.good_streak_count ?? 0,
      poorStreak:     data.poor_streak_count ?? 0,
      history:        data.recent_history   ?? [],
    },
  }
}

// ---------------------------------------------------------------------------
// saveSessionToSupabase
// Two-write session completion:
//   1. Insert one row into sessions
//   2. Update the profiles row (adaptive state + progress snapshot)
// updated_at is intentionally omitted — handled by the DB trigger.
// ---------------------------------------------------------------------------

export async function saveSessionToSupabase(
  userId: string,
  sessionRow: SupabaseSessionRow,
  profileUpdate: SupabaseProfileUpdate
): Promise<void> {
  console.log('[saveSessionToSupabase] ENTRY — userId:', userId)

  if (!supabase) {
    console.error('[saveSessionToSupabase] Supabase not configured — aborting')
    return
  }

  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[saveSessionToSupabase] Supabase auth user:', user?.id ?? 'NONE — not authenticated')

  if (!user) {
    console.error('[saveSessionToSupabase] No authenticated Supabase user — RLS will block insert')
    return
  }

  if (user.id !== userId) {
    console.error('[saveSessionToSupabase] uid mismatch — store uid:', userId, '| auth uid:', user.id)
  }

  // Write 1 — insert session row
  const sessionPayload = { user_uuid: userId, ...sessionRow }
  console.log('[saveSessionToSupabase] Inserting session row:', sessionPayload)

  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .insert(sessionPayload)
    .select()

  if (sessionError) {
    console.error('[saveSessionToSupabase] SESSION INSERT FAILED:', sessionError)
  } else {
    console.log('[saveSessionToSupabase] Session insert OK:', sessionData)
  }

  // Write 2 — update profile snapshot
  console.log('[saveSessionToSupabase] Updating profile row for uuid:', userId, profileUpdate)

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('uuid', userId)
    .select()

  if (profileError) {
    console.error('[saveSessionToSupabase] PROFILE UPDATE FAILED:', profileError)
  } else {
    console.log('[saveSessionToSupabase] Profile update OK:', profileData)
  }
}
