/**
 * Redis Store for Rate Limiter
 * Provides distributed rate limiting across multiple instances
 */

import Redis from 'ioredis';
import { config } from '../config';

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockExpiry?: number;
}

interface StoreOptions {
  prefix?: string;
  redis?: Redis;
}

/**
 * Memory Store (fallback when Redis is unavailable)
 */
class MemoryStore {
  private store: Map<string, RateLimitEntry> = new Map();

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs?: number): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());
    if (!pattern) return allKeys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(k => regex.test(k));
  }
}

/**
 * Redis Store for distributed rate limiting
 */
export class RateLimiterRedisStore {
  private redis: Redis | null = null;
  private memoryFallback: MemoryStore;
  private readonly prefix: string;
  private connected = false;
  private connecting = false;

  constructor(options: StoreOptions = {}) {
    this.prefix = options.prefix || 'ratelimit:';
    this.memoryFallback = new MemoryStore();

    if (options.redis) {
      this.redis = options.redis;
      this.connected = true;
    } else {
      this.initRedis();
    }
  }

  /**
   * Initialize Redis connection
   */
  private initRedis(): void {
    if (!config.redis.enabled) {
      console.log('[RateLimiter] Redis disabled, using memory store');
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
            console.warn('[RateLimiter] Redis connection failed, falling back to memory');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.connected = true;
        console.log('[RateLimiter] Redis connected');
      });

      this.redis.on('error', (err) => {
        console.warn('[RateLimiter] Redis error:', err.message);
        this.connected = false;
      });

      this.redis.on('close', () => {
        this.connected = false;
      });

      this.redis.connect().catch(() => {
        console.warn('[RateLimiter] Redis connection failed, using memory fallback');
        this.connected = false;
      });
    } catch {
      console.warn('[RateLimiter] Redis initialization failed, using memory fallback');
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
   * Get rate limit entry
   */
  async get(key: string): Promise<RateLimitEntry | null> {
    if (!this.connected || !this.redis) {
      return this.memoryFallback.get(key);
    }

    try {
      const data = await this.redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data) as RateLimitEntry;
    } catch {
      return this.memoryFallback.get(key);
    }
  }

  /**
   * Set rate limit entry with optional TTL
   */
  async set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void> {
    // Always update memory fallback for redundancy
    await this.memoryFallback.set(key, entry, ttlMs);

    if (!this.connected || !this.redis) {
      return;
    }

    try {
      const data = JSON.stringify(entry);
      if (ttlMs) {
        await this.redis.setex(this.getKey(key), Math.ceil(ttlMs / 1000), data);
      } else {
        await this.redis.set(this.getKey(key), data);
      }
    } catch {
      // Silent fail, memory fallback is already set
    }
  }

  /**
   * Delete rate limit entry
   */
  async delete(key: string): Promise<boolean> {
    await this.memoryFallback.delete(key);

    if (!this.connected || !this.redis) {
      return true;
    }

    try {
      await this.redis.del(this.getKey(key));
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Clear all rate limit entries
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
   * Get all keys matching pattern
   */
  async keys(pattern: string = '*'): Promise<string[]> {
    if (!this.connected || !this.redis) {
      return this.memoryFallback.keys(pattern);
    }

    try {
      const keys = await this.redis.keys(`${this.prefix}${pattern}`);
      return keys.map(k => k.replace(this.prefix, ''));
    } catch {
      return this.memoryFallback.keys(pattern);
    }
  }

  /**
   * Atomic increment for sliding window
   * Uses Lua script for atomicity
   */
  async recordRequest(
    key: string,
    windowMs: number,
    maxRequests: number,
    blockDurationMs: number
  ): Promise<{ allowed: boolean; count: number; resetTime: number; blocked: boolean }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.connected || !this.redis) {
      // Fall back to memory-based check
      let entry = await this.memoryFallback.get(key);
      
      if (!entry) {
        entry = { timestamps: [], blocked: false };
      }

      // Check if blocked
      if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
        return {
          allowed: false,
          count: maxRequests,
          resetTime: entry.blockExpiry,
          blocked: true,
        };
      }

      // Clear expired block
      if (entry.blocked && entry.blockExpiry && now >= entry.blockExpiry) {
        entry.blocked = false;
        entry.blockExpiry = undefined;
        entry.timestamps = [];
      }

      // Remove old timestamps
      entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
      const count = entry.timestamps.length;

      // Check limit
      if (count >= maxRequests) {
        entry.blocked = true;
        entry.blockExpiry = now + blockDurationMs;
        await this.memoryFallback.set(key, entry);
        return {
          allowed: false,
          count: maxRequests,
          resetTime: entry.blockExpiry,
          blocked: true,
        };
      }

      // Add new timestamp
      entry.timestamps.push(now);
      await this.memoryFallback.set(key, entry);

      const resetTime = (entry.timestamps[0] || now) + windowMs;
      return {
        allowed: true,
        count: count + 1,
        resetTime,
        blocked: false,
      };
    }

    // Use Lua script for atomic Redis operation
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local blockDurationMs = tonumber(ARGV[4])
      local windowMs = tonumber(ARGV[5])

      -- Get current entry
      local data = redis.call('GET', key)
      local entry = { timestamps = {}, blocked = false }
      
      if data then
        entry = cjson.decode(data)
      end

      -- Check if blocked
      if entry.blocked and entry.blockExpiry and now < entry.blockExpiry then
        return cjson.encode({ allowed = false, count = maxRequests, resetTime = entry.blockExpiry, blocked = true })
      end

      -- Clear expired block
      if entry.blocked and entry.blockExpiry and now >= entry.blockExpiry then
        entry.blocked = false
        entry.blockExpiry = nil
        entry.timestamps = {}
      end

      -- Remove old timestamps
      local newTimestamps = {}
      for i, ts in ipairs(entry.timestamps or {}) do
        if ts > windowStart then
          table.insert(newTimestamps, ts)
        end
      end
      entry.timestamps = newTimestamps
      local count = #entry.timestamps

      -- Check limit
      if count >= maxRequests then
        entry.blocked = true
        entry.blockExpiry = now + blockDurationMs
        redis.call('SETEX', key, math.ceil(blockDurationMs / 1000) + 1, cjson.encode(entry))
        return cjson.encode({ allowed = false, count = maxRequests, resetTime = entry.blockExpiry, blocked = true })
      end

      -- Add new timestamp
      table.insert(entry.timestamps, now)
      redis.call('SETEX', key, math.ceil(windowMs / 1000) + 1, cjson.encode(entry))

      local resetTime = (entry.timestamps[1] or now) + windowMs
      return cjson.encode({ allowed = true, count = count + 1, resetTime = resetTime, blocked = false })
    `;

    try {
      const result = await this.redis.eval(
        luaScript,
        1,
        this.getKey(key),
        now.toString(),
        windowStart.toString(),
        maxRequests.toString(),
        blockDurationMs.toString(),
        windowMs.toString()
      );

      return JSON.parse(result as string);
    } catch (error) {
      console.warn('[RateLimiter] Redis eval failed, falling back to memory:', error);
      // Fallback to non-atomic memory operation
      return this.recordRequest(key, windowMs, maxRequests, blockDurationMs);
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get store type (for monitoring)
   */
  getStoreType(): 'redis' | 'memory' {
    return this.connected ? 'redis' : 'memory';
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
}

// Singleton instance
export const rateLimiterStore = new RateLimiterRedisStore();
