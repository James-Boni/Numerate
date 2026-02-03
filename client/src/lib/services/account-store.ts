/**
 * Account Store - State Management Integration
 * 
 * Integrates AuthService and BillingService into the app's state management.
 * This provides a clean interface for account and entitlement state.
 */

import { create } from 'zustand';
import { 
  UserAccount, 
  Entitlement, 
  AuthState,
  DEFAULT_ENTITLEMENT,
  createDefaultUserAccount 
} from './types';
import { authService } from './auth-service';
import { billingService } from './billing-service';

interface AccountState {
  user: UserAccount | null;
  entitlement: Entitlement;
  authState: AuthState;
  isLoading: boolean;
  error: string | null;
}

interface AccountActions {
  initAppSession: () => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  linkApple: () => Promise<boolean>;
  restorePurchases: () => Promise<Entitlement>;
  refreshEntitlement: () => Promise<Entitlement>;
  
  devSetPremium: (isPremium: boolean) => Promise<void>;
  devSetEntitlementStatus: (status: 'inactive' | 'active' | 'grace' | 'expired') => Promise<void>;
  devSetExpiry: (hoursFromNow: number | null) => Promise<void>;
}

type AccountStore = AccountState & AccountActions;

export const useAccountStore = create<AccountStore>((set, get) => ({
  user: null,
  entitlement: { ...DEFAULT_ENTITLEMENT },
  authState: {
    status: 'signed_out',
    provider: null,
    isLoading: false,
  },
  isLoading: false,
  error: null,

  initAppSession: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const user = await authService.getCurrentUser();
      const entitlement = await billingService.getEntitlement();
      const authState = authService.getAuthState();
      
      set({
        user,
        entitlement,
        authState,
        isLoading: false,
      });
    } catch (error) {
      console.error('[AccountStore] Init error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session',
      });
    }
  },

  signIn: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.signIn();
      
      if (result.success && result.user) {
        const entitlement = await billingService.getEntitlement();
        const authState = authService.getAuthState();
        
        set({
          user: result.user,
          entitlement,
          authState,
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.error || 'Sign in failed',
        });
        return false;
      }
    } catch (error) {
      console.error('[AccountStore] Sign in error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    
    try {
      await authService.signOut();
      const authState = authService.getAuthState();
      
      set({
        user: null,
        entitlement: { ...DEFAULT_ENTITLEMENT },
        authState,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[AccountStore] Sign out error:', error);
      set({ isLoading: false });
    }
  },

  linkApple: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.linkAppleAccount();
      
      if (result.success && result.user) {
        const authState = authService.getAuthState();
        set({
          user: result.user,
          authState,
          isLoading: false,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.error || 'Failed to link Apple account',
        });
        return false;
      }
    } catch (error) {
      console.error('[AccountStore] Link Apple error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to link Apple account',
      });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const entitlement = await billingService.restorePurchases();
      set({ entitlement, isLoading: false });
      return entitlement;
    } catch (error) {
      console.error('[AccountStore] Restore purchases error:', error);
      set({ isLoading: false });
      return get().entitlement;
    }
  },

  refreshEntitlement: async () => {
    try {
      const entitlement = await billingService.syncEntitlement();
      set({ entitlement });
      return entitlement;
    } catch (error) {
      console.error('[AccountStore] Refresh entitlement error:', error);
      return get().entitlement;
    }
  },

  devSetPremium: async (isPremium: boolean) => {
    const entitlement = await billingService.devSetEntitlement(isPremium ? 'premium' : 'free');
    set({ entitlement });
  },

  devSetEntitlementStatus: async (status) => {
    const entitlement = await billingService.devSetStatus(status);
    set({ entitlement });
  },

  devSetExpiry: async (hoursFromNow: number | null) => {
    const expiresAt = hoursFromNow !== null ? Date.now() + hoursFromNow * 60 * 60 * 1000 : undefined;
    const entitlement = await billingService.devSetExpiry(expiresAt);
    set({ entitlement });
  },
}));

export function isPremiumActive(entitlement: Entitlement): boolean {
  return entitlement.tier === 'premium' && 
         (entitlement.status === 'active' || entitlement.status === 'grace');
}
