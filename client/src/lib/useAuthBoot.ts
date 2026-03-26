import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { loadProfileFromSupabase } from '@/lib/supabase-sync'
import { useStore } from '@/lib/store'
import { billingService } from '@/lib/services/billing-service'

export type BootDestination = '/train' | null

export interface AuthBootResult {
  ready: boolean
  destination: BootDestination
}

// Runs once on app start.
// Checks for an existing Supabase session, hydrates the Zustand store from
// the database if one is found, and signals where to route the user.
// Holds the splash screen until the check completes so the app never renders
// a stale or partially-hydrated state.
export function useAuthBoot(): AuthBootResult {
  const [ready, setReady] = useState(false)
  const [destination, setDestination] = useState<BootDestination>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!supabase) {
        // Supabase not configured — clear stale auth, proceed to normal flow
        useStore.setState({ uid: null, isAuthenticated: false, email: null })
        if (!cancelled) setReady(true)
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[useAuthBoot] getSession error:', error.message)
      }

      if (!session) {
        // No valid session — clear any stale auth fields from persisted state.
        // Profile/assessment fields are preserved so an in-progress onboarding
        // flow (assessment → auth) is not disrupted.
        useStore.setState({ uid: null, isAuthenticated: false, email: null })
        if (!cancelled) setReady(true)
        return
      }

      // Valid session — hydrate Zustand from Supabase (authoritative source).
      const user = session.user
      const profile = await loadProfileFromSupabase(user.id)

      if (cancelled) return

      // Identify user to the billing service before updating Zustand uid.
      // SubscriptionProvider watches uid, so logIn must complete first so that
      // the subsequent syncEntitlement() returns the correct state for this user.
      try {
        await billingService.logIn(user.id)
      } catch (err) {
        // Non-fatal — proceed even if billing service logIn fails.
        console.warn('[useAuthBoot] billingService.logIn failed (non-fatal):', err)
      }

      if (profile) {
        useStore.setState({
          ...profile,
          uid: user.id,
          isAuthenticated: true,
          email: user.email ?? null,
        })
      } else {
        // Session is valid but the profile row is missing.
        // Set auth identity so subsequent writes have a uid.
        useStore.setState({ uid: user.id, isAuthenticated: true, email: user.email ?? null })
      }

      setDestination('/train')
      setReady(true)
    }

    boot().catch(err => {
      console.error('[useAuthBoot] Unexpected error during boot:', err)
      // On error, allow the app to render rather than hanging on the splash
      if (!cancelled) setReady(true)
    })

    return () => { cancelled = true }
  }, [])

  return { ready, destination }
}
