/**
 * SubscriptionProvider + useSubscription()
 *
 * The ONLY runtime layer for subscription state in Numerate.
 * Components never call billingService or RevenueCat SDK directly.
 *
 * Browser (MockBillingService):
 *   - isSubscribed reflects entitlement stored in localStorage
 *   - purchase() calls MockBillingService.purchasePremium() → grants simulated premium
 *   - restore() returns current stored entitlement (no-op in mock mode)
 *   - monthlyPriceString / annualPriceString are null (no real packages)
 *
 * Native Capacitor (RevenueCatCapacitorService):
 *   - initializeRevenueCat() configures the SDK with the API key at app boot
 *   - All methods delegate to the real Purchases SDK
 *   - Prices come from RevenueCat offerings (monthlyPriceString / annualPriceString populated)
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
import { configureRevenueCat } from '@/lib/services/revenuecat-capacitor-service';
import { IAPProductId } from '@/lib/services/types';
import { useStore } from '@/lib/store';

// Returns true when running inside a Capacitor native shell.
// Safe to call even when @capacitor/core is not the active runtime.
function isNativeCapacitor(): boolean {
  try {
    return !!(window as any)?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

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
// Called once at app boot (App.tsx module level).
// No-op in browser — MockBillingService needs no configuration.
// On native Capacitor: reads the API key and configures the RevenueCat SDK.
// Uses VITE_REVENUECAT_IOS_API_KEY for production and
// VITE_REVENUECAT_TEST_API_KEY as a fallback for test-store device testing.
export function initializeRevenueCat(): void {
  if (!isNativeCapacitor()) return;

  const apiKey =
    (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined) ||
    (import.meta.env.VITE_REVENUECAT_TEST_API_KEY as string | undefined) ||
    null;

  if (!apiKey) {
    console.error(
      '[RevenueCat] No API key configured. ' +
      'Set VITE_REVENUECAT_IOS_API_KEY (production) or ' +
      'VITE_REVENUECAT_TEST_API_KEY (test store) in secrets.'
    );
    return;
  }

  // Fire-and-forget — configure() is fast; service methods are only called
  // after SubscriptionProvider mounts, which is after this resolves.
  configureRevenueCat(apiKey).catch(err => {
    console.error('[RevenueCat] configure failed:', err);
  });
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
