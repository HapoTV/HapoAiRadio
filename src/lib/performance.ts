// Performance monitoring utilities

// Track timing for operations
export function trackTiming(label: string): () => number {
  const start = performance.now();
  return () => {
    const end = performance.now();
    const duration = end - start;
    console.log(`Timing [${label}]: ${duration.toFixed(2)}ms`);
    return duration;
  };
}

// Memoize expensive function results
export function memoize<T, R>(
  fn: (arg: T) => R,
  getKey: (arg: T) => string = JSON.stringify
): (arg: T) => R {
  const cache = new Map<string, { value: R; timestamp: number }>();
  
  return (arg: T): R => {
    const key = getKey(arg);
    const cached = cache.get(key);
    
    if (cached) {
      return cached.value;
    }
    
    const result = fn(arg);
    cache.set(key, { value: result, timestamp: Date.now() });
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      // Remove oldest entries
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entries.length / 2; i++) {
        cache.delete(entries[i][0]);
      }
    }
    
    return result;
  };
}

// Throttle function calls
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;
  let lastResult: ReturnType<T>;
  
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      lastCall = now;
      lastResult = fn(...args);
      return lastResult;
    }
    
    return lastResult;
  };
}

// Batch multiple operations
export function batchOperations<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> {
  return new Promise((resolve, reject) => {
    const results: R[] = [];
    let index = 0;
    
    function processBatch() {
      const batch = items.slice(index, index + batchSize);
      index += batchSize;
      
      if (batch.length === 0) {
        resolve(results);
        return;
      }
      
      Promise.all(batch.map(operation))
        .then(batchResults => {
          results.push(...batchResults);
          processBatch();
        })
        .catch(reject);
    }
    
    processBatch();
  });
}

// Lazy load data
export function createLazyLoader<T>(
  loadFn: () => Promise<T>,
  options: { timeout?: number; retries?: number } = {}
): () => Promise<T> {
  const { timeout = 30000, retries = 3 } = options;
  let data: T | null = null;
  let loading = false;
  let loadPromise: Promise<T> | null = null;
  
  return async (): Promise<T> => {
    if (data !== null) {
      return data;
    }
    
    if (loading && loadPromise) {
      return loadPromise;
    }
    
    loading = true;
    
    loadPromise = new Promise<T>(async (resolve, reject) => {
      let attempts = 0;
      
      const attemptLoad = async () => {
        try {
          // Add timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Loading timed out')), timeout);
          });
          
          data = await Promise.race([loadFn(), timeoutPromise]);
          resolve(data);
        } catch (error) {
          attempts++;
          
          if (attempts >= retries) {
            reject(error);
            return;
          }
          
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          attemptLoad();
        }
      };
      
      attemptLoad();
    }).finally(() => {
      loading = false;
      loadPromise = null;
    });
    
    return loadPromise;
  };
}

// Monitor memory usage
export function monitorMemoryUsage(intervalMs: number = 60000): () => void {
  if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
    return () => {}; // Not supported
  }
  
  const intervalId = setInterval(() => {
    const { usedJSHeapSize, totalJSHeapSize } = window.performance.memory;
    const usedMB = Math.round(usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(totalJSHeapSize / 1024 / 1024);
    const percentUsed = Math.round((usedMB / totalMB) * 100);
    
    console.log(`Memory usage: ${usedMB}MB / ${totalMB}MB (${percentUsed}%)`);
    
    // Alert if memory usage is high
    if (percentUsed > 90) {
      console.warn('High memory usage detected!');
    }
  }, intervalMs);
  
  return () => clearInterval(intervalId);
}