import { SignJWT, jwtVerify } from 'jose';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { z } from 'zod';

// Initialize Redis for rate limiting
const redisClient = new Redis(import.meta.env.VITE_REDIS_URL);

// Rate limiter configurations
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit',
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

// Input validation schemas
export const schemas = {
  user: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  
  playlist: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
  }),
  
  track: z.object({
    title: z.string().min(1),
    artist: z.string().optional(),
    duration: z.number().min(0),
    file_url: z.string().url(),
  }),
};

// JWT utilities
export const jwt = {
  sign: async (payload: any, expTime = '1h') => {
    const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expTime)
      .sign(secret);
  },
  
  verify: async (token: string) => {
    const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET);
    return jwtVerify(token, secret);
  },
};

// Rate limiting middleware
export const rateLimit = async (ip: string) => {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch (error) {
    return false;
  }
};

// Security headers
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Input sanitization
export const sanitize = {
  html: (input: string) => {
    return input.replace(/<[^>]*>/g, '');
  },
  
  sql: (input: string) => {
    return input.replace(/['";]/g, '');
  },
  
  filename: (input: string) => {
    return input.replace(/[^a-zA-Z0-9.-]/g, '_');
  },
};

// File upload security
export const validateFile = (file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
}) => {
  const errors: string[] = [];
  
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`File size must be less than ${options.maxSize / 1024 / 1024}MB`);
  }
  
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${options.allowedTypes.join(', ')}`);
  }
  
  return errors;
};

// Password validation
export const validatePassword = (password: string) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors: string[] = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
  if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
  if (!hasNumbers) errors.push('Password must contain at least one number');
  if (!hasSpecialChar) errors.push('Password must contain at least one special character');
  
  return errors;
};