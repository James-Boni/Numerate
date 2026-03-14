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

export async function ensureProfile(userId: string, startingLevel: number): Promise<ProfileResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { uuid: userId, levels: startingLevel, xp: 0, streak: 0 },
      { onConflict: 'uuid', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[ensureProfile] Failed to ensure profile:', error.message)
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
