/**
 * RevenueCatCapacitorService — Stage 3 real implementation
 *
 * Implements IBillingService using @revenuecat/purchases-capacitor.
 * Only instantiated when isNativeCapacitor() is true (see billing-service.ts).
 * Never imported or used by components — all access goes through useSubscription().
 *
 * Assumes Purchases.configure() has already been called via configureRevenueCat()
 * from initializeRevenueCat() in revenuecat.tsx.
 */

import { Purchases } from '@revenuecat/purchases-capacitor';
import {
  Entitlement,
  EntitlementStatus,
  IBillingService,
  DEFAULT_ENTITLEMENT,
  IAPProductId,
} from './types';

const PREMIUM_ENTITLEMENT_ID = 'premium';

// Derive the CustomerInfo type from the SDK's own return type so we don't
// depend on the internal package's re-export path.
type GetCustomerInfoResult = Awaited<ReturnType<typeof Purchases.getCustomerInfo>>;
type RCCustomerInfo = GetCustomerInfoResult['customerInfo'];

function mapCustomerInfo(customerInfo: RCCustomerInfo): Entitlement {
  const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!active || !active.isActive) {
    return { ...DEFAULT_ENTITLEMENT };
  }
  return {
    tier: 'premium',
    source: 'apple_iap',
    // RevenueCat's active map includes grace-period entries (isActive stays true).
    // The willRenew flag identifies non-renewing (e.g. cancelled) subscriptions.
    status: 'active',
    productId: active.productIdentifier,
    expiresAt: active.expirationDateMillis ?? undefined,
    updatedAt: Date.now(),
  };
}

// ── Module-level configure call ───────────────────────────────────────────────
// Called once at app boot from initializeRevenueCat() in revenuecat.tsx.
// Must complete before any service method is used.
export async function configureRevenueCat(apiKey: string): Promise<void> {
  await Purchases.configure({ apiKey });
}

// ── Service implementation ────────────────────────────────────────────────────

export class RevenueCatCapacitorService implements IBillingService {

  // ─── Identity ──────────────────────────────────────────────────────────────

  async logIn(userId: string): Promise<void> {
    try {
      await Purchases.logIn({ appUserID: userId });
    } catch (err) {
      // Non-fatal: SubscriptionProvider will still re-sync entitlement.
      console.warn('[RevenueCat] logIn failed:', err);
    }
  }

  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (err) {
      // Non-fatal: may throw if already anonymous.
      console.warn('[RevenueCat] logOut failed:', err);
    }
  }

  // ─── Entitlement ───────────────────────────────────────────────────────────

  async getEntitlement(): Promise<Entitlement> {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return mapCustomerInfo(customerInfo);
  }

  async syncEntitlement(): Promise<Entitlement> {
    // getCustomerInfo() uses RevenueCat's cache with automatic server refresh.
    return this.getEntitlement();
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  async purchasePremium(productId: IAPProductId): Promise<Entitlement> {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      p => p.product.identifier === productId
    );
    if (!pkg) {
      throw new Error(`[RevenueCat] No package found for product: ${productId}`);
    }
    // Throws on user cancellation or payment failure — caller handles the error.
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return mapCustomerInfo(customerInfo);
  }

  async restorePurchases(): Promise<Entitlement> {
    const { customerInfo } = await Purchases.restorePurchases();
    return mapCustomerInfo(customerInfo);
  }

  // ─── Dev helpers — no-ops in production service ────────────────────────────

  async devSetEntitlement(_tier: 'free' | 'premium'): Promise<Entitlement> {
    console.warn('[RevenueCat] devSetEntitlement is a no-op in RevenueCatCapacitorService');
    return this.getEntitlement();
  }

  async devSetStatus(_status: EntitlementStatus): Promise<Entitlement> {
    console.warn('[RevenueCat] devSetStatus is a no-op in RevenueCatCapacitorService');
    return this.getEntitlement();
  }

  async devSetExpiry(_expiresAt: number | undefined): Promise<Entitlement> {
    console.warn('[RevenueCat] devSetExpiry is a no-op in RevenueCatCapacitorService');
    return this.getEntitlement();
  }
}
