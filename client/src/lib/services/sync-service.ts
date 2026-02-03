/**
 * SyncService - Progress Synchronization
 * 
 * Handles syncing user progress and sessions between local state and backend.
 * Implements offline-first pattern with queue for failed operations.
 */

import { authService } from './auth-service';

interface SyncQueueItem {
  type: 'progress' | 'session';
  data: unknown;
  timestamp: number;
  retries: number;
}

const SYNC_QUEUE_KEY = 'numerate_sync_queue';

class SyncService {
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;

  async initialize(): Promise<void> {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      try {
        this.queue = JSON.parse(stored);
      } catch {
        this.queue = [];
      }
    }
    
    this.processQueue();
    
    window.addEventListener('online', () => this.processQueue());
  }

  private saveQueue(): void {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const token = authService.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async syncProgress(progressData: unknown): Promise<boolean> {
    const token = authService.getAuthToken();
    if (!token) {
      console.warn('Cannot sync progress: no auth token');
      return false;
    }

    try {
      const response = await fetch('/api/sync/progress', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(progressData),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.warn('Progress sync failed, queuing for retry:', error);
      this.addToQueue('progress', progressData);
      return false;
    }
  }

  async syncSession(sessionData: unknown): Promise<boolean> {
    const token = authService.getAuthToken();
    if (!token) {
      console.warn('Cannot sync session: no auth token');
      return false;
    }

    try {
      const response = await fetch('/api/sync/session', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`Session sync failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.warn('Session sync failed, queuing for retry:', error);
      this.addToQueue('session', sessionData);
      return false;
    }
  }

  async fetchServerData(): Promise<{ progress: unknown; sessions: unknown[] } | null> {
    const token = authService.getAuthToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/sync/progress', {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch server data:', error);
      return null;
    }
  }

  private addToQueue(type: 'progress' | 'session', data: unknown): void {
    this.queue.push({
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
    this.saveQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    const processedItems: number[] = [];

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      
      if (item.retries >= 5) {
        processedItems.push(i);
        continue;
      }

      try {
        const endpoint = item.type === 'progress' ? '/api/sync/progress' : '/api/sync/session';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          processedItems.push(i);
        } else {
          item.retries++;
        }
      } catch {
        item.retries++;
      }
    }

    this.queue = this.queue.filter((_, index) => !processedItems.includes(index));
    this.saveQueue();
    this.isSyncing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const syncService = new SyncService();
