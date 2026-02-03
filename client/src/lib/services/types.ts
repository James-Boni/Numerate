/**
 * iOS Readiness Framework - Core Types
 * 
 * Canonical data models for user accounts, authentication, and entitlements.
 * These types are the single source of truth for the entire application.
 * 
 * SECURITY RULES:
 * - NEVER store passwords
 * - NEVER store payment card data
 * - NEVER store Apple identity tokens long-term
 * - Apple subject identifier (appleSub) is optional and never used as primary key
 */

export type AuthProvider = 'anonymous' | 'apple';
export type EntitlementTier = 'free' | 'premium';
export type EntitlementSource = 'none' | 'apple_iap';
export type EntitlementStatus = 'inactive' | 'active' | 'grace' | 'expired';

export interface Entitlement {
  tier: EntitlementTier;
  source: EntitlementSource;
  status: EntitlementStatus;
  productId?: string;
  originalTransactionId?: string;
  expiresAt?: number;
  updatedAt: number;
}

export interface DailyAggregate {
  date: string;
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number;
  medianMs: number;
  qps: number;
  xpEarned: number;
}

export interface UserAccount {
  id: string;
  authProvider: AuthProvider;
  appleSub?: string;
  createdAt: number;
  lastLoginAt: number;
  
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  
  hasCompletedAssessment: boolean;
  initialAssessmentLevel?: number;
  competenceGroup: number;
  
  entitlement: Entitlement;
}

export interface AuthState {
  status: 'signed_out' | 'signed_in';
  provider: AuthProvider | null;
  isLoading: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
}

export const DEFAULT_ENTITLEMENT: Entitlement = {
  tier: 'free',
  source: 'none',
  status: 'inactive',
  updatedAt: Date.now(),
};

export function createDefaultUserAccount(id: string): UserAccount {
  return {
    id,
    authProvider: 'anonymous',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    level: 1,
    xpTotal: 0,
    xpIntoLevel: 0,
    hasCompletedAssessment: false,
    competenceGroup: 1,
    entitlement: { ...DEFAULT_ENTITLEMENT },
  };
}

export const IAP_PRODUCTS = {
  PREMIUM_MONTHLY: 'com.numerate.premium.monthly',
  PREMIUM_YEARLY: 'com.numerate.premium.yearly',
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];
