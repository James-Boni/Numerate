/**
 * RevenueCatCapacitorService — Stage 1 stub
 *
 * Implements IBillingService for native Capacitor builds using
 * @revenuecat/purchases-capacitor (installed in Stage 3).
 *
 * Stage 1: all methods are stubs that log their intent and return safe defaults.
 * Stage 3: replace each stub body with the real @revenuecat/purchases-capacitor
 *          API call (Purchases.configureWith, Purchases.getOfferings,
 *          Purchases.purchasePackage, Purchases.restorePurchases, etc.).
 *
 * Components must NEVER import this class directly. All access goes through
 * useSubscription() → SubscriptionProvider → billingService singleton.
 */

import {
  Entitlement,
  EntitlementStatus,
  IBillingService,
  DEFAULT_ENTITLEMENT,
  IAPProductId,
} from './types';

export class RevenueCatCapacitorService implements IBillingService {

  // ─── Identity ────────────────────────────────────────────────────────────

  async logIn(userId: string): Promise<void> {
    // Stage 3: await Purchases.logIn({ appUserID: userId })
    console.log('[RevenueCat] logIn stub:', userId);
  }

  async logOut(): Promise<void> {
    // Stage 3: await Purchases.logOut()
    console.log('[RevenueCat] logOut stub');
  }

  // ─── Entitlement ─────────────────────────────────────────────────────────

  async getEntitlement(): Promise<Entitlement> {
    // Stage 3: const info = await Purchases.getCustomerInfo()
    //          return mapCustomerInfoToEntitlement(info)
    console.log('[RevenueCat] getEntitlement stub — returning free default');
    return { ...DEFAULT_ENTITLEMENT };
  }

  async syncEntitlement(): Promise<Entitlement> {
    // Stage 3: same as getEntitlement (forces a server-side refresh)
    return this.getEntitlement();
  }

  // ─── Purchases ────────────────────────────────────────────────────────────

  async purchasePremium(productId: IAPProductId): Promise<Entitlement> {
    // Stage 3:
    //   const offerings = await Purchases.getOfferings()
    //   const pkg = offerings.current?.availablePackages.find(
    //     p => p.product.identifier === productId
    //   )
    //   if (!pkg) throw new Error('Package not found: ' + productId)
    //   await Purchases.purchasePackage({ aPackage: pkg })
    //   return this.getEntitlement()
    console.log('[RevenueCat] purchasePremium stub:', productId);
    return { ...DEFAULT_ENTITLEMENT };
  }

  async restorePurchases(): Promise<Entitlement> {
    // Stage 3: await Purchases.restorePurchases()
    //          return this.getEntitlement()
    console.log('[RevenueCat] restorePurchases stub');
    return { ...DEFAULT_ENTITLEMENT };
  }

  // ─── Dev helpers (no-ops in production native service) ───────────────────

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
