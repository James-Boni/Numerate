/**
 * AuthService - Authentication Framework
 * 
 * Connects to backend for user registration and authentication.
 * Stores auth token locally for offline-first capability.
 * Supports "anonymous first, link Apple later" pattern.
 */

import { 
  UserAccount, 
  AuthState, 
  AuthResult, 
  AuthProvider,
  createDefaultUserAccount 
} from './types';
import { storageService } from './storage-service';

export interface IAuthService {
  initialize(): Promise<void>;
  getCurrentUser(): Promise<UserAccount | null>;
  signIn(): Promise<AuthResult>;
  signOut(): Promise<void>;
  linkAppleAccount(): Promise<AuthResult>;
  getAuthState(): AuthState;
  getAuthToken(): string | null;
  isAppleAuthAvailable(): boolean;
}

const AUTH_TOKEN_KEY = 'numerate_auth_token';
const USER_CACHE_KEY = 'numerate_user_cache';

interface CachedUser {
  id: string;
  provider: AuthProvider;
  email?: string;
  appleLinked: boolean;
  entitlementTier: 'free' | 'premium';
  entitlementStatus: string;
  cachedAt: number;
}

class BackendAuthService implements IAuthService {
  private currentUser: UserAccount | null = null;
  private authToken: string | null = null;
  private authState: AuthState = {
    status: 'signed_out',
    provider: null,
    isLoading: true,
  };

  async initialize(): Promise<void> {
    this.authToken = await storageService.get<string>(AUTH_TOKEN_KEY);
    
    if (this.authToken) {
      const cached = await storageService.get<CachedUser>(USER_CACHE_KEY);
      if (cached) {
        this.currentUser = this.cachedUserToAccount(cached);
        this.authState = {
          status: 'signed_in',
          provider: cached.provider,
          isLoading: false,
        };
      }
      
      this.refreshUserFromServer().catch(console.error);
    } else {
      this.authState = {
        status: 'signed_out',
        provider: null,
        isLoading: false,
      };
    }
  }

  private cachedUserToAccount(cached: CachedUser): UserAccount {
    const user = createDefaultUserAccount(cached.id);
    user.authProvider = cached.provider;
    user.email = cached.email;
    user.appleLinked = cached.appleLinked;
    return user;
  }

  private async refreshUserFromServer(): Promise<void> {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const cached: CachedUser = {
          id: data.user.id,
          provider: data.user.appleSubjectId ? 'apple' : 'anonymous',
          email: data.user.email,
          appleLinked: !!data.user.appleSubjectId,
          entitlementTier: data.user.entitlementTier || 'free',
          entitlementStatus: data.user.entitlementStatus || 'none',
          cachedAt: Date.now(),
        };
        await storageService.set(USER_CACHE_KEY, cached);
        this.currentUser = this.cachedUserToAccount(cached);
        this.authState = {
          status: 'signed_in',
          provider: cached.provider,
          isLoading: false,
        };
      } else if (response.status === 401) {
        await this.signOut();
      }
    } catch (error) {
      console.warn('Failed to refresh user from server, using cached data:', error);
    }
  }

  async getCurrentUser(): Promise<UserAccount | null> {
    return this.currentUser;
  }

  async signIn(): Promise<AuthResult> {
    this.authState = { ...this.authState, isLoading: true };
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      this.authToken = data.authToken;
      await storageService.set(AUTH_TOKEN_KEY, this.authToken);
      
      const cached: CachedUser = {
        id: data.user.id,
        provider: 'anonymous',
        appleLinked: false,
        entitlementTier: 'free',
        entitlementStatus: 'none',
        cachedAt: Date.now(),
      };
      await storageService.set(USER_CACHE_KEY, cached);
      
      this.currentUser = this.cachedUserToAccount(cached);
      this.authState = {
        status: 'signed_in',
        provider: 'anonymous',
        isLoading: false,
      };
      
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Sign in failed:', error);
      this.authState = { ...this.authState, isLoading: false };
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  async signOut(): Promise<void> {
    await storageService.remove(AUTH_TOKEN_KEY);
    await storageService.remove(USER_CACHE_KEY);
    this.currentUser = null;
    this.authToken = null;
    this.authState = {
      status: 'signed_out',
      provider: null,
      isLoading: false,
    };
  }

  async linkAppleAccount(): Promise<AuthResult> {
    return {
      success: false,
      error: 'Apple Sign-In integration pending. Requires Expo iOS build.',
    };
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  isAppleAuthAvailable(): boolean {
    return false;
  }
}

class AppleAuthService implements IAuthService {
  private backendService = new BackendAuthService();

  async initialize(): Promise<void> {
    return this.backendService.initialize();
  }

  async getCurrentUser(): Promise<UserAccount | null> {
    return this.backendService.getCurrentUser();
  }

  async signIn(): Promise<AuthResult> {
    return this.backendService.signIn();
  }

  async signOut(): Promise<void> {
    return this.backendService.signOut();
  }

  async linkAppleAccount(): Promise<AuthResult> {
    return {
      success: false,
      error: 'Apple Sign-In integration pending. Requires Expo iOS build.',
    };
  }

  getAuthState(): AuthState {
    return this.backendService.getAuthState();
  }

  getAuthToken(): string | null {
    return this.backendService.getAuthToken();
  }

  isAppleAuthAvailable(): boolean {
    return false;
  }
}

function createAuthService(): IAuthService {
  const isExpoiOS = false;
  
  if (isExpoiOS) {
    return new AppleAuthService();
  }
  return new BackendAuthService();
}

export const authService: IAuthService = createAuthService();
