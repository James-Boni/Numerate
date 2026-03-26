/**
 * SubscriptionProvider + useSubscription()
 *
 * The ONLY runtime layer for subscription state in Numerate.
 * Components never call billingService or RevenueCat SDK directly.
 *
 * Stage 1 behaviour (browser / MockBillingService):
 *   - isSubscribed reflects entitlement stored in localStorage
 *   - purchase() calls MockBillingService.purchasePremium() → grants a 30- or
 *     365-day simulated premium entitlement and updates isSubscribed
 *   - restore() returns the current stored entitlement (no-op in mock mode)
 *   - logIn / logOut are no-ops in mock mode (called automatically on auth change)
 *   - monthlyPriceString / annualPriceString are null (no real packages yet)
 *
 * Stage 3: RevenueCatCapacitorService becomes active; the hook surface is identical.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { billingService } from '@/lib/services/billing-service';
import { IAPProductId } from '@/lib/services/types';
import { useStore } from '@/lib/store';

// ── helpers ──────────────────────────────────────────────────────────────────

function isEntitlementActive(tier: string, status: string): boolean {
  return tier === 'premium' && (status === 'active' || status === 'grace');
}

// ── context ───────────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  isSubscribed: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  // Null in mock/browser mode; populated from RevenueCat offerings in Stage 3.
  monthlyPriceString: string | null;
  annualPriceString: string | null;
  purchase: (productId: IAPProductId) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ── initializeRevenueCat ──────────────────────────────────────────────────────
// Stage 1: no-op. In Stage 3 this will call:
//   Purchases.configureWith({ apiKey: import.meta.env.VITE_REVENUECAT_IOS_API_KEY })
export function initializeRevenueCat(): void {
  // Stage 3 implementation goes here.
}

// ── SubscriptionProvider ──────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const uid = useStore(s => s.uid);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Re-sync entitlement whenever uid changes (login or logout).
  // This fires once on mount (uid = null → free) and again after auth boot
  // sets uid, which is after billingService.logIn() has already been called.
  const sync = useCallback(async () => {
    try {
      const entitlement = await billingService.syncEntitlement();
      setIsSubscribed(isEntitlementActive(entitlement.tier, entitlement.status));
    } catch (err) {
      console.error('[SubscriptionProvider] syncEntitlement failed:', err);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    sync();
  }, [uid, sync]);

  const purchase = useCallback(async (productId: IAPProductId) => {
    setIsPurchasing(true);
    try {
      const entitlement = await billingService.purchasePremium(productId);
      setIsSubscribed(isEntitlementActive(entitlement.tier, entitlement.status));
    } finally {
      setIsPurchasing(false);
    }
    // Note: throws on failure — caller handles the error.
  }, []);

  const restore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const entitlement = await billingService.restorePurchases();
      setIsSubscribed(isEntitlementActive(entitlement.tier, entitlement.status));
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        isLoading,
        isPurchasing,
        isRestoring,
        // Stage 1: no real RevenueCat offerings — components fall back to
        // their hardcoded display prices when these are null.
        monthlyPriceString: null,
        annualPriceString: null,
        purchase,
        restore,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── useSubscription ───────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription() must be used inside <SubscriptionProvider>');
  }
  return ctx;
}
