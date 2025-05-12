import sharp from 'sharp';
import compression from 'compression';
import type { Request, Response, NextFunction } from 'express';

// Image optimization
export const optimizeImage = async (
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'avif';
  }
) => {
  try {
    let image = sharp(buffer);
    
    // Resize if dimensions provided
    if (options.width || options.height) {
      image = image.resize(options.width, options.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Convert to specified format
    switch (options.format) {
      case 'webp':
        image = image.webp({ quality: options.quality || 80 });
        break;
      case 'avif':
        image = image.avif({ quality: options.quality || 80 });
        break;
      default:
        image = image.jpeg({ quality: options.quality || 80 });
    }
    
    return image.toBuffer();
  } catch (error) {
    console.error('Image optimization error:', error);
    throw error;
  }
};

// Compression middleware
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// Response time monitoring middleware
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
    
    // Send to monitoring service
    if (duration > 1000) {
      console.warn(`Slow response detected: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
};

// Cache control middleware
export const cacheControl = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', `public, max-age=${duration}`);
    next();
  };
};

// Database query optimization
export const optimizeQuery = (query: string): string => {
  // Remove unnecessary whitespace
  query = query.replace(/\s+/g, ' ').trim();
  
  // Add EXPLAIN ANALYZE for debugging
  if (process.env.NODE_ENV === 'development') {
    query = `EXPLAIN ANALYZE ${query}`;
  }
  
  return query;
};

// Resource cleanup
export const cleanup = {
  // Clean up temporary files
  tempFiles: async (dir: string) => {
    // Implementation
  },
  
  // Clean up expired cache entries
  cache: async () => {
    // Implementation
  },
  
  // Clean up old logs
  logs: async (olderThan: Date) => {
    // Implementation
  },
};

// Performance monitoring
export const monitor = {
  // Track memory usage
  memory: () => {
    const used = process.memoryUsage();
    return {
      heapTotal: used.heapTotal / 1024 / 1024,
      heapUsed: used.heapUsed / 1024 / 1024,
      external: used.external / 1024 / 1024,
      rss: used.rss / 1024 / 1024,
    };
  },
  
  // Track CPU usage
  cpu: () => {
    const startUsage = process.cpuUsage();
    return () => {
      const endUsage = process.cpuUsage(startUsage);
      return {
        user: endUsage.user / 1000000,
        system: endUsage.system / 1000000,
      };
    };
  },
  
  // Track database connections
  database: () => {
    // Implementation
  },
};