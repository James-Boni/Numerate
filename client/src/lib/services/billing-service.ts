/**
 * BillingService - In-App Purchase Framework
 *
 * IBillingService is defined in types.ts.
 * Implementations:
 *   - MockBillingService         active in browser / dev (always)
 *   - RevenueCatCapacitorService active in native Capacitor builds (Stage 3)
 *
 * SECURITY RULES:
 * - UI must never call billingService directly.
 *   All entitlement reads happen through useSubscription().
 * - Production builds cannot toggle entitlement state.
 * - Dev tools (devSetEntitlement etc.) are no-ops in RevenueCatCapacitorService.
 */

import {
  Entitlement,
  EntitlementStatus,
  IBillingService,
  DEFAULT_ENTITLEMENT,
  IAP_PRODUCTS,
  IAPProductId,
} from './types';
import { storageService } from './storage-service';
import { RevenueCatCapacitorService } from './revenuecat-capacitor-service';

const ENTITLEMENT_STORAGE_KEY = 'numerate_entitlement';

export class MockBillingService implements IBillingService {
  private entitlement: Entitlement = { ...DEFAULT_ENTITLEMENT };
  private initialized = false;

  private async loadEntitlement(): Promise<void> {
    if (this.initialized) return;
    const stored = await storageService.get<Entitlement>(ENTITLEMENT_STORAGE_KEY);
    if (stored) this.entitlement = stored;
    this.initialized = true;
  }

  private async saveEntitlement(): Promise<void> {
    await storageService.set(ENTITLEMENT_STORAGE_KEY, this.entitlement);
  }

  async getEntitlement(): Promise<Entitlement> {
    await this.loadEntitlement();
    if (this.entitlement.expiresAt && this.entitlement.status === 'active') {
      if (Date.now() > this.entitlement.expiresAt) {
        this.entitlement.status = 'expired';
        this.entitlement.updatedAt = Date.now();
        await this.saveEntitlement();
      }
    }
    return { ...this.entitlement };
  }

  async purchasePremium(productId: IAPProductId): Promise<Entitlement> {
    await this.loadEntitlement();
    const isMonthly = productId === IAP_PRODUCTS.PREMIUM_MONTHLY;
    const durationMs = isMonthly
      ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;

    this.entitlement = {
      tier: 'premium',
      source: 'apple_iap',
      status: 'active',
      productId,
      originalTransactionId: `mock_txn_${Date.now()}`,
      expiresAt: Date.now() + durationMs,
      updatedAt: Date.now(),
    };

    await this.saveEntitlement();
    return { ...this.entitlement };
  }

  async restorePurchases(): Promise<Entitlement> {
    await this.loadEntitlement();
    return { ...this.entitlement };
  }

  async syncEntitlement(): Promise<Entitlement> {
    await this.loadEntitlement();
    return { ...this.entitlement };
  }

  async logIn(_userId: string): Promise<void> {
    // Mock: no-op. RevenueCatCapacitorService calls Purchases.logIn() here.
  }

  async logOut(): Promise<void> {
    // Mock: no-op. RevenueCatCapacitorService calls Purchases.logOut() here.
  }

  async devSetEntitlement(tier: 'free' | 'premium'): Promise<Entitlement> {
    if (import.meta.env.MODE === 'production') {
      console.warn('[MockBillingService] Dev methods disabled in production');
      return this.getEntitlement();
    }
    await this.loadEntitlement();
    if (tier === 'premium') {
      this.entitlement = {
        tier: 'premium',
        source: 'none',
        status: 'active',
        updatedAt: Date.now(),
      };
    } else {
      this.entitlement = { ...DEFAULT_ENTITLEMENT, updatedAt: Date.now() };
    }
    await this.saveEntitlement();
    return { ...this.entitlement };
  }

  async devSetStatus(status: EntitlementStatus): Promise<Entitlement> {
    if (import.meta.env.MODE === 'production') {
      console.warn('[MockBillingService] Dev methods disabled in production');
      return this.getEntitlement();
    }
    await this.loadEntitlement();
    this.entitlement.status = status;
    this.entitlement.updatedAt = Date.now();
    await this.saveEntitlement();
    return { ...this.entitlement };
  }

  async devSetExpiry(expiresAt: number | undefined): Promise<Entitlement> {
    if (import.meta.env.MODE === 'production') {
      console.warn('[MockBillingService] Dev methods disabled in production');
      return this.getEntitlement();
    }
    await this.loadEntitlement();
    this.entitlement.expiresAt = expiresAt;
    this.entitlement.updatedAt = Date.now();
    await this.saveEntitlement();
    return { ...this.entitlement };
  }
}

// Returns true when running inside a Capacitor native shell (iOS/Android).
// Safe to call even when @capacitor/core is not yet installed — it checks
// the runtime global injected by the Capacitor bridge.
function isNativeCapacitor(): boolean {
  try {
    return !!(window as any)?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function createBillingService(): IBillingService {
  if (isNativeCapacitor()) {
    return new RevenueCatCapacitorService();
  }
  return new MockBillingService();
}

export type { IBillingService } from './types';
export const billingService: IBillingService = createBillingService();
