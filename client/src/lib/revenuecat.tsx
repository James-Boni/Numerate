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
// Called once at module load in App.tsx. Two paths:
//
//   Browser / Replit preview → isNativeCapacitor() is false → returns immediately.
//   MockBillingService is used; no RevenueCat SDK calls are ever made.
//
//   Native Capacitor (device / Simulator) → configures the RevenueCat SDK.
//   Which API key is used:
//
//     VITE_REVENUECAT_TEST_API_KEY  — set this for RevenueCat Test Store builds.
//       The RevenueCat Test Store is a RevenueCat-managed sandbox that lets you
//       test purchase flows on a Simulator or device without real App Store accounts.
//       Use the iOS public SDK key from the RevenueCat Test Store project.
//       Priority: checked FIRST so it wins during active development.
//
//     VITE_REVENUECAT_IOS_API_KEY   — set this for TestFlight and App Store builds.
//       This is the iOS public SDK key from your production RevenueCat app.
//       Apple sandbox accounts (sandbox Apple IDs) work automatically with this
//       key when running a debug or TestFlight build — RevenueCat detects them.
//       Priority: fallback when the test-store key is absent.
//
//   In practice: set only VITE_REVENUECAT_TEST_API_KEY while developing,
//   set only VITE_REVENUECAT_IOS_API_KEY when cutting a TestFlight or App Store build.
export function initializeRevenueCat(): void {
  if (!isNativeCapacitor()) return;

  // Test Store key takes priority so a dev environment never accidentally hits
  // the production RevenueCat project.
  const apiKey =
    (import.meta.env.VITE_REVENUECAT_TEST_API_KEY as string | undefined) ||
    (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined) ||
    null;

  if (!apiKey) {
    console.error(
      '[RevenueCat] No API key found. ' +
      'Add VITE_REVENUECAT_TEST_API_KEY (RevenueCat Test Store, for Simulator/dev device) ' +
      'or VITE_REVENUECAT_IOS_API_KEY (production/TestFlight) to Replit Secrets.'
    );
    return;
  }

  if (import.meta.env.DEV) {
    const usingTestKey = !!import.meta.env.VITE_REVENUECAT_TEST_API_KEY;
    console.debug(
      '[RevenueCat] initializeRevenueCat — using',
      usingTestKey ? 'Test Store key (VITE_REVENUECAT_TEST_API_KEY)' : 'iOS key (VITE_REVENUECAT_IOS_API_KEY)'
    );
  }

  // Fire-and-forget — Purchases.configure() completes well before
  // SubscriptionProvider mounts and makes its first syncEntitlement() call.
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
