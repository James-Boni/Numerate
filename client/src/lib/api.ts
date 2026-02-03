import type { User, UserProgress, Session } from '@shared/schema';
import { authService } from './services/auth-service';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = authService.getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  async register(): Promise<{ user: User; progress: UserProgress; authToken: string }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to register user');
    }
    return response.json();
  },

  async login(authToken: string): Promise<{ user: User; progress: UserProgress; sessions: Session[] }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken }),
    });
    if (!response.ok) {
      throw new Error('Failed to login');
    }
    return response.json();
  },

  async getMe(): Promise<{ user: User; progress: UserProgress; sessions: Session[] }> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  async createUser(): Promise<{ user: User; progress: UserProgress }> {
    const response = await fetch(`${API_BASE}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  },

  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE}/user/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  async getProgress(userId: string): Promise<UserProgress> {
    const response = await fetch(`${API_BASE}/progress/${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Progress not found (404)');
      }
      throw new Error('Failed to fetch progress');
    }
    return response.json();
  },

  async updateProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress> {
    const response = await fetch(`${API_BASE}/progress/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!response.ok) {
      throw new Error('Failed to update progress');
    }
    return response.json();
  },

  async syncProgress(progress: Partial<UserProgress>): Promise<{ progress: UserProgress }> {
    const response = await fetch(`${API_BASE}/sync/progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(progress),
    });
    if (!response.ok) {
      throw new Error('Failed to sync progress');
    }
    return response.json();
  },

  async fetchSyncData(): Promise<{ progress: UserProgress; sessions: Session[] }> {
    const response = await fetch(`${API_BASE}/sync/progress`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch sync data');
    }
    return response.json();
  },

  async syncSession(session: Omit<Session, 'id' | 'userId' | 'date'>): Promise<{ session: Session }> {
    const response = await fetch(`${API_BASE}/sync/session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(session),
    });
    if (!response.ok) {
      throw new Error('Failed to sync session');
    }
    return response.json();
  },

  async getSessions(userId: string): Promise<Session[]> {
    const response = await fetch(`${API_BASE}/sessions/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return response.json();
  },

  async createSession(userId: string, session: Omit<Session, 'id' | 'userId' | 'date'>): Promise<Session> {
    const response = await fetch(`${API_BASE}/sessions/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    return response.json();
  },
};
