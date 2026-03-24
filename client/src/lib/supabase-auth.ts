import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthResult {
  user: User | null
  error: string | null
}

interface ProfileResult {
  success: boolean
  error: string | null
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { user: null, error: 'Supabase is not configured' }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { user: null, error: 'Supabase is not configured' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

// Onboarding path only.
// Called after sign-up succeeds and assessment context is present.
// Creates the full profile row with placement data.
export async function ensureProfile(
  userId: string,
  startingLevel: number,
  competenceGroup: number
): Promise<ProfileResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' }
  }

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

// Sign-in safety path only.
// Called after sign-in succeeds. Does not require onboarding context.
// Upserts a minimal row so the profile exists — silent on conflict.
export async function ensureProfileExists(userId: string): Promise<ProfileResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' }
  }

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

export async function signOut(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not configured' }
  }

  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}
