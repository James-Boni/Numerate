/**
 * ApiClient - Backend Contract
 * 
 * Defines the API contract for future backend integration.
 * Currently uses LocalApiClient which returns local state.
 * 
 * Planned endpoints:
 * - POST /auth/apple - Apple Sign-In
 * - GET /me - Current user and entitlement
 * - POST /billing/apple/confirm - Confirm IAP receipt
 * - POST /billing/apple/notifications - App Store server notifications
 */

import { UserAccount, Entitlement } from './types';

export interface ApiSession {
  token: string;
  expiresAt: number;
}

export interface AuthAppleRequest {
  appleIdentityToken: string;
  nonce?: string;
}

export interface AuthAppleResponse {
  user: UserAccount;
  session: ApiSession;
}

export interface MeResponse {
  user: UserAccount;
  entitlement: Entitlement;
}

export interface ConfirmPurchaseRequest {
  transactionId: string;
  productId: string;
  environment: 'sandbox' | 'production';
}

export interface ConfirmPurchaseResponse {
  entitlement: Entitlement;
}

export interface IApiClient {
  authWithApple(request: AuthAppleRequest): Promise<AuthAppleResponse>;
  getMe(): Promise<MeResponse>;
  confirmApplePurchase(request: ConfirmPurchaseRequest): Promise<ConfirmPurchaseResponse>;
}

class LocalApiClient implements IApiClient {
  private localUser: UserAccount | null = null;
  private localEntitlement: Entitlement | null = null;

  setLocalState(user: UserAccount | null, entitlement: Entitlement | null): void {
    this.localUser = user;
    this.localEntitlement = entitlement;
  }

  async authWithApple(_request: AuthAppleRequest): Promise<AuthAppleResponse> {
    throw new Error('Apple authentication not available in local mode');
  }

  async getMe(): Promise<MeResponse> {
    if (!this.localUser || !this.localEntitlement) {
      throw new Error('No local user state available');
    }
    return {
      user: this.localUser,
      entitlement: this.localEntitlement,
    };
  }

  async confirmApplePurchase(_request: ConfirmPurchaseRequest): Promise<ConfirmPurchaseResponse> {
    if (!this.localEntitlement) {
      throw new Error('No entitlement state available');
    }
    return {
      entitlement: this.localEntitlement,
    };
  }
}

class RemoteApiClient implements IApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async authWithApple(request: AuthAppleRequest): Promise<AuthAppleResponse> {
    return this.request('POST', '/auth/apple', request);
  }

  async getMe(): Promise<MeResponse> {
    return this.request('GET', '/me');
  }

  async confirmApplePurchase(request: ConfirmPurchaseRequest): Promise<ConfirmPurchaseResponse> {
    return this.request('POST', '/billing/apple/confirm', request);
  }
}

function createApiClient(): IApiClient {
  const useRemote = false;
  const apiBaseUrl = '/api';
  
  if (useRemote) {
    return new RemoteApiClient(apiBaseUrl);
  }
  return new LocalApiClient();
}

export const apiClient = createApiClient();
export { LocalApiClient, RemoteApiClient };
