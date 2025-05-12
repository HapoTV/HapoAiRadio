import Redis from 'ioredis';
import { supabase } from './supabase';

// Initialize Redis client
const redis = new Redis(import.meta.env.VITE_REDIS_URL);

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class Cache {
  private prefix: string;
  private defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    this.prefix = config.prefix || 'app:';
    this.defaultTTL = config.ttl || 3600; // 1 hour default
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getKey(key);
      await redis.set(cacheKey, JSON.stringify(value), 'EX', ttl || this.defaultTTL);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redis.del(this.getKey(key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const keys = await redis.keys(this.getKey(pattern || '*'));
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Create playlist cache instance
export const playlistCache = new Cache({ prefix: 'playlist:', ttl: 1800 }); // 30 minutes

// Create track cache instance
export const trackCache = new Cache({ prefix: 'track:', ttl: 3600 }); // 1 hour

// Create store cache instance
export const storeCache = new Cache({ prefix: 'store:', ttl: 300 }); // 5 minutes

// Cache middleware for Supabase queries
export const withCache = async <T>(
  key: string,
  query: () => Promise<{ data: T | null; error: any }>,
  cache: Cache = new Cache(),
  ttl?: number
): Promise<{ data: T | null; error: any }> => {
  try {
    // Try to get from cache first
    const cached = await cache.get<T>(key);
    if (cached) {
      return { data: cached, error: null };
    }

    // If not in cache, execute query
    const { data, error } = await query();
    
    // If query successful, cache the result
    if (!error && data) {
      await cache.set(key, data, ttl);
    }

    return { data, error };
  } catch (error) {
    console.error('Cache middleware error:', error);
    // Fall back to direct query if cache fails
    return query();
  }
};

// Example usage:
export const getPlaylistWithCache = async (id: string) => {
  return withCache(
    `playlist:${id}`,
    () => supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single(),
    playlistCache
  );
};