import type { User, UserProgress, Session } from '@shared/schema';

const API_BASE = '/api';

export const api = {
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
