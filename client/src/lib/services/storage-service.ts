/**
 * StorageService - Secure Storage Abstraction
 * 
 * Provides a unified interface for persistent storage that can be
 * swapped between implementations:
 * - Web: localStorage wrapper
 * - Expo iOS: SecureStore wrapper (future)
 * 
 * SECURITY NOTES:
 * - Do NOT store Apple identity tokens
 * - Do NOT store payment card data
 * - Only store: internal UUID, provider, minimal session markers
 */

export interface IStorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageService implements IStorageService {
  private prefix = 'numerate_';

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`[StorageService] Error reading ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`[StorageService] Error writing ${key}:`, error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`[StorageService] Error removing ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[StorageService] Error clearing storage:', error);
    }
  }
}

class SecureStorageService implements IStorageService {
  private fallback = new LocalStorageService();

  async get<T>(key: string): Promise<T | null> {
    return this.fallback.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.fallback.set(key, value);
  }

  async remove(key: string): Promise<void> {
    return this.fallback.remove(key);
  }

  async clear(): Promise<void> {
    return this.fallback.clear();
  }
}

function createStorageService(): IStorageService {
  const isExpoiOS = false;
  
  if (isExpoiOS) {
    return new SecureStorageService();
  }
  return new LocalStorageService();
}

export const storageService: IStorageService = createStorageService();
