/**
 * BillingService - In-App Purchase Framework
 * 
 * Interface for subscription management with two implementations:
 * - MockBillingService: For development with entitlement toggling
 * - AppleIAPService: Stubbed for future StoreKit integration
 * 
 * SECURITY RULES:
 * - UI should only display entitlement based on getEntitlement()
 * - Production builds cannot toggle premium via UI
 * - Only dev tools can toggle premium in development
 */

import { 
  Entitlement, 
  EntitlementStatus, 
  DEFAULT_ENTITLEMENT,
  IAP_PRODUCTS,
  IAPProductId
} from './types';
import { storageService } from './storage-service';

export interface IBillingService {
  getEntitlement(): Promise<Entitlement>;
  purchasePremium(productId: IAPProductId): Promise<Entitlement>;
  restorePurchases(): Promise<Entitlement>;
  syncEntitlement(): Promise<Entitlement>;
  
  devSetEntitlement(tier: 'free' | 'premium'): Promise<Entitlement>;
  devSetStatus(status: EntitlementStatus): Promise<Entitlement>;
  devSetExpiry(expiresAt: number | undefined): Promise<Entitlement>;
}

const ENTITLEMENT_STORAGE_KEY = 'numerate_entitlement';

class MockBillingService implements IBillingService {
  private entitlement: Entitlement = { ...DEFAULT_ENTITLEMENT };
  private initialized = false;

  private async loadEntitlement(): Promise<void> {
    if (this.initialized) return;
    
    const stored = await storageService.get<Entitlement>(ENTITLEMENT_STORAGE_KEY);
    if (stored) {
      this.entitlement = stored;
    }
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
    const durationMs = isMonthly ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
    
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

  async devSetEntitlement(tier: 'free' | 'premium'): Promise<Entitlement> {
    if (import.meta.env.MODE === 'production') {
      console.warn('[BillingService] Dev methods disabled in production');
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
      console.warn('[BillingService] Dev methods disabled in production');
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
      console.warn('[BillingService] Dev methods disabled in production');
      return this.getEntitlement();
    }
    
    await this.loadEntitlement();
    this.entitlement.expiresAt = expiresAt;
    this.entitlement.updatedAt = Date.now();
    await this.saveEntitlement();
    return { ...this.entitlement };
  }
}

class AppleIAPService implements IBillingService {
  private mockService = new MockBillingService();

  async getEntitlement(): Promise<Entitlement> {
    return this.mockService.getEntitlement();
  }

  async purchasePremium(productId: IAPProductId): Promise<Entitlement> {
    console.warn('[AppleIAPService] StoreKit integration pending');
    return this.mockService.getEntitlement();
  }

  async restorePurchases(): Promise<Entitlement> {
    console.warn('[AppleIAPService] StoreKit restore pending');
    return this.mockService.getEntitlement();
  }

  async syncEntitlement(): Promise<Entitlement> {
    return this.mockService.syncEntitlement();
  }

  async devSetEntitlement(tier: 'free' | 'premium'): Promise<Entitlement> {
    return this.mockService.devSetEntitlement(tier);
  }

  async devSetStatus(status: EntitlementStatus): Promise<Entitlement> {
    return this.mockService.devSetStatus(status);
  }

  async devSetExpiry(expiresAt: number | undefined): Promise<Entitlement> {
    return this.mockService.devSetExpiry(expiresAt);
  }
}

function createBillingService(): IBillingService {
  const isExpoiOS = false;
  
  if (isExpoiOS) {
    return new AppleIAPService();
  }
  return new MockBillingService();
}

export const billingService: IBillingService = createBillingService();
