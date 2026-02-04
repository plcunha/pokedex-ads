/**
 * Advanced Rate Limiter Service
 * Implements sliding window rate limiting with per-endpoint configuration
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockExpiry?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

interface EndpointConfig {
  pattern: RegExp | string;
  config: Partial<RateLimitConfig>;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  blocked: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  blockDurationMs: 60 * 1000, // 1 minute block after limit exceeded
  message: 'Too many requests, please try again later',
};

/**
 * Sliding Window Rate Limiter
 * Uses a sliding window algorithm for more accurate rate limiting
 */
class RateLimiterService {
  private store: Map<string, RateLimitEntry> = new Map();
  private globalConfig: RateLimitConfig;
  private endpointConfigs: EndpointConfig[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.globalConfig = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Add endpoint-specific rate limit configuration
   */
  addEndpointConfig(pattern: RegExp | string, config: Partial<RateLimitConfig>): void {
    this.endpointConfigs.push({ pattern, config });
  }

  /**
   * Get configuration for a specific endpoint
   */
  private getConfigForEndpoint(path: string): RateLimitConfig {
    for (const endpoint of this.endpointConfigs) {
      const matches = endpoint.pattern instanceof RegExp
        ? endpoint.pattern.test(path)
        : path.startsWith(endpoint.pattern);
      
      if (matches) {
        return { ...this.globalConfig, ...endpoint.config };
      }
    }
    return this.globalConfig;
  }

  /**
   * Generate key for rate limit tracking
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = this.normalizePath(req.path);
    return `${ip}:${path}`;
  }

  /**
   * Normalize path for grouping similar routes
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/pokemon\/[^/]+/, '/pokemon/:name')
      .replace(/\?.*$/, '');
  }

  /**
   * Check if request should be rate limited using sliding window
   */
  check(req: Request): { allowed: boolean; info: RateLimitInfo } {
    const config = this.getConfigForEndpoint(req.path);
    const key = this.generateKey(req, config);
    const now = Date.now();
    
    let entry = this.store.get(key);
    
    if (!entry) {
      entry = { timestamps: [], blocked: false };
      this.store.set(key, entry);
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          current: config.maxRequests,
          remaining: 0,
          resetTime: new Date(entry.blockExpiry),
          blocked: true,
        },
      };
    }

    // Clear block if expired
    if (entry.blocked && entry.blockExpiry && now >= entry.blockExpiry) {
      entry.blocked = false;
      entry.blockExpiry = undefined;
      entry.timestamps = [];
    }

    // Sliding window: remove timestamps outside the window
    const windowStart = now - config.windowMs;
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

    // Calculate current count using sliding window weight
    const currentCount = entry.timestamps.length;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    
    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      entry.blocked = true;
      entry.blockExpiry = now + (config.blockDurationMs || 60000);
      
      return {
        allowed: false,
        info: {
          limit: config.maxRequests,
          current: currentCount,
          remaining: 0,
          resetTime: new Date(entry.blockExpiry),
          blocked: true,
        },
      };
    }

    // Add current request timestamp
    entry.timestamps.push(now);

    // Calculate reset time (when oldest request expires from window)
    const oldestTimestamp = entry.timestamps[0] || now;
    const resetTime = new Date(oldestTimestamp + config.windowMs);

    return {
      allowed: true,
      info: {
        limit: config.maxRequests,
        current: currentCount + 1,
        remaining: remaining - 1,
        resetTime,
        blocked: false,
      },
    };
  }

  /**
   * Create Express middleware
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.getConfigForEndpoint(req.path);
      const { allowed, info } = this.check(req);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

      if (!allowed) {
        res.setHeader('Retry-After', Math.ceil((info.resetTime.getTime() - Date.now()) / 1000));
        
        // Return JSON or HTML based on Accept header
        if (req.accepts('html')) {
          res.status(429).render('error', {
            title: 'Limite de Requisições Excedido',
            message: config.message || DEFAULT_CONFIG.message,
            statusCode: 429,
          });
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            message: config.message || DEFAULT_CONFIG.message,
            retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
          });
        }
        return;
      }

      next();
    };
  }

  /**
   * Get rate limit info for a specific key (for monitoring)
   */
  getInfo(key: string): RateLimitInfo | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    const windowStart = now - this.globalConfig.windowMs;
    const activeTimestamps = entry.timestamps.filter(ts => ts > windowStart);
    
    return {
      limit: this.globalConfig.maxRequests,
      current: activeTimestamps.length,
      remaining: Math.max(0, this.globalConfig.maxRequests - activeTimestamps.length),
      resetTime: new Date((activeTimestamps[0] || now) + this.globalConfig.windowMs),
      blocked: entry.blocked,
    };
  }

  /**
   * Get all rate limit entries (for monitoring)
   */
  getAllEntries(): Map<string, RateLimitInfo> {
    const result = new Map<string, RateLimitInfo>();
    
    for (const [key] of this.store) {
      const info = this.getInfo(key);
      if (info) {
        result.set(key, info);
      }
    }
    
    return result;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.globalConfig.windowMs;

      for (const [key, entry] of this.store) {
        // Remove entries with no recent timestamps and not blocked
        const activeTimestamps = entry.timestamps.filter(ts => ts > windowStart);
        
        if (activeTimestamps.length === 0 && !entry.blocked) {
          this.store.delete(key);
        } else if (entry.blocked && entry.blockExpiry && now >= entry.blockExpiry) {
          // Clear expired blocks
          entry.blocked = false;
          entry.blockExpiry = undefined;
          entry.timestamps = activeTimestamps;
        } else {
          entry.timestamps = activeTimestamps;
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance with default config
export const rateLimiter = new RateLimiterService();

// Export class for custom instances
export { RateLimiterService, RateLimitConfig, RateLimitInfo, EndpointConfig };
