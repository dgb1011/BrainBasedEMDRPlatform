import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  }
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Please wait before making more requests',
    retryAfter: 60
  }
});

// Account lockout tracking
interface LockoutAttempt {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  lastAttempt: Date;
}

const lockoutStore = new Map<string, LockoutAttempt>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const accountLockoutMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.path !== '/api/auth/login' || req.method !== 'POST') {
    return next();
  }

  const email = req.body?.email?.toLowerCase();
  if (!email) {
    return next();
  }

  const attempt = lockoutStore.get(email);
  
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / (60 * 1000));
    return res.status(423).json({
      error: 'Account temporarily locked',
      message: `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      lockedUntil: attempt.lockedUntil.toISOString(),
      retryAfter: minutesLeft * 60
    });
  }

  next();
};

export const trackLoginAttempt = (email: string, success: boolean) => {
  const normalizedEmail = email.toLowerCase();
  const attempt = lockoutStore.get(normalizedEmail) || {
    email: normalizedEmail,
    attempts: 0,
    lastAttempt: new Date()
  };

  if (success) {
    // Reset on successful login
    lockoutStore.delete(normalizedEmail);
  } else {
    attempt.attempts += 1;
    attempt.lastAttempt = new Date();

    if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
    }

    lockoutStore.set(normalizedEmail, attempt);
  }
};

// IP blocking for suspicious activity
const suspiciousIPs = new Set<string>();
const ipRequestCount = new Map<string, { count: number; resetTime: number }>();

export const ipProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip;
  
  // Block known suspicious IPs
  if (suspiciousIPs.has(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP has been blocked due to suspicious activity'
    });
  }

  // Track request count per IP
  const now = Date.now();
  const windowDuration = 60 * 1000; // 1 minute
  const maxRequestsPerWindow = 200;

  const ipData = ipRequestCount.get(clientIP) || { count: 0, resetTime: now + windowDuration };
  
  if (now > ipData.resetTime) {
    ipData.count = 1;
    ipData.resetTime = now + windowDuration;
  } else {
    ipData.count++;
  }

  ipRequestCount.set(clientIP, ipData);

  // Block if too many requests
  if (ipData.count > maxRequestsPerWindow) {
    suspiciousIPs.add(clientIP);
    console.warn(`IP ${clientIP} blocked for excessive requests`);
    
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Your IP has been temporarily blocked due to excessive requests'
    });
  }

  next();
};

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially harmful characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

// Security headers
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' wss: ws:; " +
    "media-src 'self'; " +
    "frame-src 'self';"
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server identification
  res.removeHeader('X-Powered-By');

  next();
};

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:5173'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  exposedHeaders: ['set-cookie']
};

// Request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.userId || null
    };

    // Log to console (in production, send to logging service)
    if (res.statusCode >= 400) {
      console.error('HTTP Error:', logData);
    } else {
      console.log('HTTP Request:', logData);
    }

    return originalSend.call(this, body);
  };

  next();
};

// Bot detection
const botUserAgents = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i, /python/i
];

export const botDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  
  if (botUserAgents.some(pattern => pattern.test(userAgent))) {
    // Log bot access
    console.warn(`Bot detected: ${userAgent} from ${req.ip}`);
    
    // Allow legitimate bots for health checks
    if (req.path === '/api/health') {
      return next();
    }
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Automated requests are not allowed'
    });
  }

  next();
};

// Cleanup old data periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean up IP request tracking
  for (const [ip, data] of ipRequestCount.entries()) {
    if (now > data.resetTime + 60000) { // Extra minute buffer
      ipRequestCount.delete(ip);
    }
  }

  // Clean up old lockout attempts
  for (const [email, attempt] of lockoutStore.entries()) {
    if (attempt.lockedUntil && attempt.lockedUntil.getTime() < now - 60000) {
      lockoutStore.delete(email);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes






