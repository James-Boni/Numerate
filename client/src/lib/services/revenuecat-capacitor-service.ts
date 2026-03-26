/**
 * RevenueCatCapacitorService — native IAP implementation
 *
 * Implements IBillingService using @revenuecat/purchases-capacitor.
 * Only instantiated when isNativeCapacitor() is true (see billing-service.ts).
 * Never called by components directly — all access goes through useSubscription().
 *
 * Assumes configureRevenueCat() has been called before any service method is used.
 * That call happens in initializeRevenueCat() → revenuecat.tsx, at app boot.
 *
 * Entitlement identifier: "premium"  (must match RevenueCat dashboard)
 * Offering identifier:    "default"  (RevenueCat serves current offering automatically)
 */

import { Purchases } from '@revenuecat/purchases-capacitor';
import {
  Entitlement,
  EntitlementStatus,
  IBillingService,
  DEFAULT_ENTITLEMENT,
  IAPProductId,
} from './types';

// Must match the entitlement identifier configured in the RevenueCat dashboard.
const PREMIUM_ENTITLEMENT_ID = 'premium';

const DEV = import.meta.env.DEV;

// Derive CustomerInfo from the SDK's own return type — avoids depending on
// the internal package's re-export path.
type GetCustomerInfoResult = Awaited<ReturnType<typeof Purchases.getCustomerInfo>>;
type RCCustomerInfo = GetCustomerInfoResult['customerInfo'];

function mapCustomerInfo(customerInfo: RCCustomerInfo): Entitlement {
  const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];

  // RevenueCat's `.active` map already excludes expired entitlements, but
  // we double-check isActive for safety (grace-period entries stay here too).
  if (!active || !active.isActive) {
    return { ...DEFAULT_ENTITLEMENT };
  }

  return {
    tier: 'premium',
    source: 'apple_iap',
    // Grace-period entries are still in `.active` with isActive=true.
    // We map them as 'active' — the paywall gate checks both 'active' and 'grace'.
    status: 'active',
    productId: active.productIdentifier,
    expiresAt: active.expirationDateMillis ?? undefined,
    updatedAt: Date.now(),
  };
}

// ── SDK configure ─────────────────────────────────────────────────────────────
// Called once at app boot from initializeRevenueCat() in revenuecat.tsx.
// No-op guard lives there — this function always performs the configure call.
export async function configureRevenueCat(apiKey: string): Promise<void> {
  if (DEV) {
    console.debug('[RevenueCat] configuring SDK…', {
      keyPrefix: apiKey.slice(0, 8) + '…',
    });
  }
  await Purchases.configure({ apiKey });
  if (DEV) {
    console.debug('[RevenueCat] SDK configured successfully');
  }
}

// ── Service implementation ────────────────────────────────────────────────────

export class RevenueCatCapacitorService implements IBillingService {

  // ─── Identity ──────────────────────────────────────────────────────────────

  async logIn(userId: string): Promise<void> {
    try {
      await Purchases.logIn({ appUserID: userId });
      if (DEV) console.debug('[RevenueCat] logIn OK:', userId);
    } catch (err) {
      // Non-fatal: SubscriptionProvider re-syncs entitlement regardless.
      console.warn('[RevenueCat] logIn failed:', err);
    }
  }

  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
      if (DEV) console.debug('[RevenueCat] logOut OK');
    } catch (err) {
      // Non-fatal: SDK may throw if user is already anonymous.
      console.warn('[RevenueCat] logOut failed:', err);
    }
  }

  // ─── Entitlement ───────────────────────────────────────────────────────────

  async getEntitlement(): Promise<Entitlement> {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = mapCustomerInfo(customerInfo);
    if (DEV) {
      console.debug('[RevenueCat] getEntitlement →', {
        tier: entitlement.tier,
        status: entitlement.status,
        productId: entitlement.productId ?? null,
        expiresAt: entitlement.expiresAt
          ? new Date(entitlement.expiresAt).toISOString()
          : null,
      });
    }
    return entitlement;
  }

  async syncEntitlement(): Promise<Entitlement> {
    // getCustomerInfo() uses RevenueCat's local cache and auto-refreshes from
    // the server in the background — suitable for boot-time sync.
    if (DEV) console.debug('[RevenueCat] syncEntitlement called');
    return this.getEntitlement();
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  async purchasePremium(productId: IAPProductId): Promise<Entitlement> {
    // Fetch the current offering from RevenueCat (cached after first fetch).
    const offerings = await Purchases.getOfferings();

    if (DEV) {
      const pkgIds = offerings.current?.availablePackages.map(
        p => p.product.identifier
      ) ?? [];
      console.debug('[RevenueCat] current offering packages:', pkgIds);
    }

    // Find the package whose underlying product matches the requested productId.
    // This supports monthly, annual, and any future product IDs without changes here.
    const pkg = offerings.current?.availablePackages.find(
      p => p.product.identifier === productId
    );

    if (!pkg) {
      throw new Error(
        `[RevenueCat] No package found for product "${productId}". ` +
        'Ensure the product is attached to the current offering in the RevenueCat dashboard.'
      );
    }

    if (DEV) console.debug('[RevenueCat] purchasing package:', pkg.product.identifier);

    // Throws on user cancellation or StoreKit payment failure.
    // The caller (SubscriptionProvider.purchase) propagates this to the UI.
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const entitlement = mapCustomerInfo(customerInfo);

    if (DEV) {
      console.debug('[RevenueCat] purchase complete →', {
        tier: entitlement.tier,
        status: entitlement.status,
      });
    }

    return entitlement;
  }

  async restorePurchases(): Promise<Entitlement> {
    if (DEV) console.debug('[RevenueCat] restorePurchases called');
    const { customerInfo } = await Purchases.restorePurchases();
    const entitlement = mapCustomerInfo(customerInfo);
    if (DEV) {
      console.debug('[RevenueCat] restore complete →', {
        tier: entitlement.tier,
        status: entitlement.status,
      });
    }
    // The returned entitlement is immediately set in SubscriptionProvider.restore(),
    // so isSubscribed updates without a separate sync call.
    return entitlement;
  }

  // ─── Dev helpers — no-ops in the real service ──────────────────────────────
  // These exist only to satisfy IBillingService; DevMenu / test flows use them
  // via MockBillingService in the browser. RevenueCat state can't be overridden
  // locally — use the RevenueCat dashboard's "Grant entitlement" for manual QA.

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
