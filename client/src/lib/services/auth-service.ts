/**
 * AuthService - Authentication Framework
 * 
 * Interface for authentication with two implementations:
 * - MockAuthService: For development and current behavior
 * - AppleAuthService: Stubbed for future SIWA integration
 * 
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
  getCurrentUser(): Promise<UserAccount | null>;
  signIn(): Promise<AuthResult>;
  signOut(): Promise<void>;
  linkAppleAccount(): Promise<AuthResult>;
  getAuthState(): AuthState;
  isAppleAuthAvailable(): boolean;
}

const AUTH_STORAGE_KEY = 'numerate_auth';

interface StoredAuthData {
  userId: string;
  provider: AuthProvider;
  lastLoginAt: number;
}

class MockAuthService implements IAuthService {
  private currentUser: UserAccount | null = null;
  private authState: AuthState = {
    status: 'signed_out',
    provider: null,
    isLoading: false,
  };

  async getCurrentUser(): Promise<UserAccount | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const stored = await storageService.get<StoredAuthData>(AUTH_STORAGE_KEY);
    if (stored) {
      const user = createDefaultUserAccount(stored.userId);
      user.authProvider = stored.provider;
      user.lastLoginAt = stored.lastLoginAt;
      this.currentUser = user;
      this.authState = {
        status: 'signed_in',
        provider: stored.provider,
        isLoading: false,
      };
      return user;
    }
    return null;
  }

  async signIn(): Promise<AuthResult> {
    const userId = crypto.randomUUID();
    const user = createDefaultUserAccount(userId);
    
    await storageService.set<StoredAuthData>(AUTH_STORAGE_KEY, {
      userId: user.id,
      provider: 'anonymous',
      lastLoginAt: user.lastLoginAt,
    });

    this.currentUser = user;
    this.authState = {
      status: 'signed_in',
      provider: 'anonymous',
      isLoading: false,
    };

    return { success: true, user };
  }

  async signOut(): Promise<void> {
    await storageService.remove(AUTH_STORAGE_KEY);
    this.currentUser = null;
    this.authState = {
      status: 'signed_out',
      provider: null,
      isLoading: false,
    };
  }

  async linkAppleAccount(): Promise<AuthResult> {
    return {
      success: false,
      error: 'Apple Sign-In not available in development mode',
    };
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  isAppleAuthAvailable(): boolean {
    return false;
  }
}

class AppleAuthService implements IAuthService {
  private mockService = new MockAuthService();

  async getCurrentUser(): Promise<UserAccount | null> {
    return this.mockService.getCurrentUser();
  }

  async signIn(): Promise<AuthResult> {
    return this.mockService.signIn();
  }

  async signOut(): Promise<void> {
    return this.mockService.signOut();
  }

  async linkAppleAccount(): Promise<AuthResult> {
    return {
      success: false,
      error: 'Apple Sign-In integration pending. Requires Expo iOS build.',
    };
  }

  getAuthState(): AuthState {
    return this.mockService.getAuthState();
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
  return new MockAuthService();
}

export const authService: IAuthService = createAuthService();
