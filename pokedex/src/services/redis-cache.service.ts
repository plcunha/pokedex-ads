/**
 * Redis Cache Service
 * Distributed caching with Redis and fallback to in-memory cache
 */

import Redis from 'ioredis';
import { config } from '../config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  backend: 'redis' | 'memory';
  connected: boolean;
}

/**
 * Memory Cache (fallback)
 */
class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(options: { maxSize?: number; defaultTtl?: number } = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTtl = options.defaultTtl || 1000 * 60 * 30;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats(): Promise<CacheStats> {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      backend: 'memory',
      connected: true,
    };
  }

  async disconnect(): Promise<void> {
    // No-op for memory cache
  }
}

/**
 * Redis Cache Service with automatic fallback to memory
 */
export class RedisCacheService<T = unknown> {
  private redis: Redis | null = null;
  private memoryFallback: MemoryCache<T>;
  private readonly prefix: string;
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private connected = false;
  private connecting = false;

  constructor(options: {
    prefix?: string;
    maxSize?: number;
    defaultTtl?: number;
  } = {}) {
    this.prefix = options.prefix || 'pokedex:';
    this.defaultTtl = options.defaultTtl || config.cache.ttl;
    this.maxSize = options.maxSize || config.cache.maxSize;
    
    this.memoryFallback = new MemoryCache<T>({
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
    });

    this.initRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initRedis(): void {
    if (!config.redis.enabled) {
      console.log('[Cache] Redis disabled, using memory cache');
      return;
    }

    if (this.connecting) return;
    this.connecting = true;

    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Cache] Redis connection failed, falling back to memory cache');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.connected = true;
        console.log('[Cache] Redis connected');
      });

      this.redis.on('error', (err) => {
        console.warn('[Cache] Redis error:', err.message);
        this.connected = false;
      });

      this.redis.on('close', () => {
        this.connected = false;
      });

      // Attempt connection
      this.redis.connect().catch(() => {
        console.warn('[Cache] Redis connection failed, using memory fallback');
        this.connected = false;
      });
    } catch {
      console.warn('[Cache] Redis initialization failed, using memory fallback');
      this.connected = false;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    if (!this.connected || !this.redis) {
      return this.memoryFallback.get(key);
    }

    try {
      const data = await this.redis.get(this.getKey(key));
      if (!data) return null;
      
      return JSON.parse(data) as T;
    } catch {
      // Fallback to memory on error
      return this.memoryFallback.get(key);
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, data: T, ttl?: number): Promise<void> {
    const ttlMs = ttl || this.defaultTtl;
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    // Always update memory fallback for redundancy
    await this.memoryFallback.set(key, data, ttlMs);

    if (!this.connected || !this.redis) {
      return;
    }

    try {
      await this.redis.setex(
        this.getKey(key),
        ttlSeconds,
        JSON.stringify(data)
      );
    } catch {
      // Silent fail, memory fallback is already set
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.connected || !this.redis) {
      return this.memoryFallback.has(key);
    }

    try {
      const exists = await this.redis.exists(this.getKey(key));
      return exists === 1;
    } catch {
      return this.memoryFallback.has(key);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    await this.memoryFallback.delete(key);

    if (!this.connected || !this.redis) {
      return true;
    }

    try {
      const deleted = await this.redis.del(this.getKey(key));
      return deleted === 1;
    } catch {
      return true;
    }
  }

  /**
   * Clear all cache entries with prefix
   */
  async clear(): Promise<void> {
    await this.memoryFallback.clear();

    if (!this.connected || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Silent fail
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.connected || !this.redis) {
      return this.memoryFallback.getStats();
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      return {
        size: keys.length,
        maxSize: this.maxSize,
        backend: 'redis',
        connected: this.connected,
      };
    } catch {
      return this.memoryFallback.getStats();
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   */
  async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.connected || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}${pattern}`);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// Legacy CacheService export for backward compatibility
export { MemoryCache as CacheService };

// Singleton instance for Pokemon data
export const pokemonCache = new RedisCacheService({
  prefix: 'pokedex:pokemon:',
  maxSize: config.cache.maxSize,
  defaultTtl: config.cache.ttl,
});
