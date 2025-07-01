// Simple in-memory cache implementation
type CacheEntry<T> = {
  value: T;
  expiry: number;
};

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  // Set a value in the cache with TTL in milliseconds
  set<T>(key: string, value: T, ttl: number = 60000): void {
    // Clean expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  // Get a value from the cache
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value as T;
  }

  // Remove a value from the cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all values from the cache
  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Create a global cache instance
export const globalCache = new MemoryCache();

// Decorator for caching function results
export function withCache<T>(
  fn: (...args: any[]) => Promise<T>,
  keyFn: (...args: any[]) => string,
  ttl: number = 60000
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    const cacheKey = keyFn(...args);
    const cached = globalCache.get<T>(cacheKey);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = await fn(...args);
    globalCache.set(cacheKey, result, ttl);
    return result;
  };
}

// Cache for Supabase queries
export async function cachedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  ttl: number = 60000
): Promise<{ data: T | null; error: any }> {
  const cached = globalCache.get<{ data: T | null; error: any }>(cacheKey);
  
  if (cached !== undefined) {
    return cached;
  }
  
  const result = await queryFn();
  
  if (!result.error) {
    globalCache.set(cacheKey, result, ttl);
  }
  
  return result;
}

// Prefetch and cache data
export async function prefetchData<T>(
  queryFn: () => Promise<T>,
  cacheKey: string,
  ttl: number = 60000
): Promise<void> {
  try {
    const result = await queryFn();
    globalCache.set(cacheKey, result, ttl);
  } catch (error) {
    console.error(`Failed to prefetch data for key ${cacheKey}:`, error);
  }
}

// Export the cache instance
export default globalCache;