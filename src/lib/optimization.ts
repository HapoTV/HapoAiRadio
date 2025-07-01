import { supabase } from './supabase';

// Cache for frequently accessed data
const cache = new Map<string, { data: any, timestamp: number, ttl: number }>();

// Function to get data with caching
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60000 // Default TTL: 1 minute
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: now, ttl });
  return data;
}

// Function to clear cache
export function clearCache(keyPrefix?: string): void {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Function to optimize image loading
export function optimizeImageUrl(url: string, width?: number, height?: number): string {
  if (!url) return '';
  
  // If it's a Supabase storage URL, add transformation parameters
  if (url.includes('storage.googleapis.com') || url.includes('supabase.co')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
}

// Function to batch database operations
export async function batchOperation<T>(
  items: T[],
  operation: (batch: T[]) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
}

// Function to debounce database writes
export function debounceOperation<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingReject: ((reason: any) => void) | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgs = args;
    
    if (!pendingPromise) {
      pendingPromise = new Promise<ReturnType<T>>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }
    
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(async () => {
      try {
        if (lastArgs && pendingResolve) {
          const result = await fn(...lastArgs);
          pendingResolve(result);
        }
      } catch (error) {
        if (pendingReject) pendingReject(error);
      } finally {
        timer = null;
        pendingPromise = null;
        pendingResolve = null;
        pendingReject = null;
        lastArgs = null;
      }
    }, delay);
    
    return pendingPromise;
  };
}

// Function to optimize query performance
export function optimizeQuery(query: string): string {
  // Remove unnecessary whitespace
  query = query.replace(/\s+/g, ' ').trim();
  
  // Add EXPLAIN ANALYZE for debugging in development
  if (process.env.NODE_ENV === 'development') {
    query = `EXPLAIN ANALYZE ${query}`;
  }
  
  return query;
}

// Function to optimize Supabase queries with pagination
export async function paginatedQuery<T>(
  tableName: string,
  options: {
    pageSize?: number;
    page?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
    select?: string;
  } = {}
): Promise<{ data: T[]; count: number; pageCount: number }> {
  const {
    pageSize = 20,
    page = 1,
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {},
    select = '*'
  } = options;
  
  // Calculate range for pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  // Build query
  let query = supabase
    .from(tableName)
    .select(select, { count: 'exact' })
    .range(from, to)
    .order(orderBy, { ascending: orderDirection === 'asc' });
  
  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }
  
  // Execute query
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    data: data as T[],
    count: count || 0,
    pageCount: Math.ceil((count || 0) / pageSize)
  };
}

// Function to monitor performance
export function monitorPerformance<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  
  return fn().finally(() => {
    const duration = performance.now() - start;
    console.log(`Performance [${label}]: ${duration.toFixed(2)}ms`);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
  });
}