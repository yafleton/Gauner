interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  set<T>(key: string, data: T, ttlHours: number = 24): void {
    const now = Date.now();
    const expiry = now + (ttlHours * 60 * 60 * 1000); // Convert hours to milliseconds
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry
    });

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: now,
        expiry
      }));
    } catch (error) {
      console.warn('Failed to cache to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // First check memory cache
    const memoryItem = this.cache.get(key);
    if (memoryItem && this.isValid(memoryItem)) {
      return memoryItem.data;
    }

    // Then check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (this.isValid(item)) {
          // Restore to memory cache
          this.cache.set(key, item);
          return item.data;
        } else {
          // Remove expired item
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage cache:', error);
    }

    return null;
  }

  private isValid(item: CacheItem<any>): boolean {
    return Date.now() < item.expiry;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      localStorage.removeItem(`cache_${key}`);
    } else {
      this.cache.clear();
      // Clear all cache items from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('cache_')) {
          localStorage.removeItem(k);
        }
      });
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Cache keys
export const CACHE_KEYS = {
  AZURE_VOICES: 'azure_voices',
  CHANNELS_DATA: 'channels_data',
  USER_PREFERENCES: 'user_preferences',
  YOUTUBE_CHANNELS: 'youtube_channels_global',
  TUBECHEF_CHANNELS: 'tubechef_channels',
} as const;
