/**
 * RedisCacheService Unit Tests
 * Tests the Redis cache with memory fallback
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock ioredis before importing the service
vi.mock('ioredis', () => {
  const mockRedisInstance = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };

  return {
    default: vi.fn(() => mockRedisInstance),
  };
});

// Mock config to control Redis enabled state
vi.mock('../../src/config', () => ({
  config: {
    cache: {
      ttl: 1800000,
      maxSize: 500,
    },
    redis: {
      enabled: false, // Disable Redis by default for tests
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0,
    },
  },
}));

// Import after mocking
import { RedisCacheService, CacheService } from '../../src/services/redis-cache.service';

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create new instance for each test (uses memory fallback since Redis is disabled)
    cacheService = new RedisCacheService<string>({
      prefix: 'test:',
      maxSize: 3,
      defaultTtl: 1000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Memory Fallback Mode', () => {
    describe('get and set', () => {
      it('should store and retrieve a value', async () => {
        await cacheService.set('key1', 'value1');
        const result = await cacheService.get('key1');
        expect(result).toBe('value1');
      });

      it('should return null for non-existent key', async () => {
        const result = await cacheService.get('nonexistent');
        expect(result).toBeNull();
      });

      it('should overwrite existing value', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key1', 'value2');
        const result = await cacheService.get('key1');
        expect(result).toBe('value2');
      });
    });

    describe('TTL expiration', () => {
      it('should return null for expired entries', async () => {
        await cacheService.set('key1', 'value1', 500);
        
        // Advance time past TTL
        vi.advanceTimersByTime(600);
        
        const result = await cacheService.get('key1');
        expect(result).toBeNull();
      });

      it('should return value before TTL expires', async () => {
        await cacheService.set('key1', 'value1', 1000);
        
        // Advance time but not past TTL
        vi.advanceTimersByTime(500);
        
        const result = await cacheService.get('key1');
        expect(result).toBe('value1');
      });
    });

    describe('max size eviction', () => {
      it('should evict oldest entry when max size is reached', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key2', 'value2');
        await cacheService.set('key3', 'value3');
        
        // This should evict key1
        await cacheService.set('key4', 'value4');

        expect(await cacheService.get('key1')).toBeNull();
        expect(await cacheService.get('key2')).toBe('value2');
        expect(await cacheService.get('key3')).toBe('value3');
        expect(await cacheService.get('key4')).toBe('value4');
      });
    });

    describe('has', () => {
      it('should return true for existing valid key', async () => {
        await cacheService.set('key1', 'value1');
        const result = await cacheService.has('key1');
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const result = await cacheService.has('nonexistent');
        expect(result).toBe(false);
      });

      it('should return false for expired key', async () => {
        await cacheService.set('key1', 'value1', 500);
        vi.advanceTimersByTime(600);
        const result = await cacheService.has('key1');
        expect(result).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete an existing key', async () => {
        await cacheService.set('key1', 'value1');
        const deleted = await cacheService.delete('key1');
        expect(deleted).toBe(true);
        expect(await cacheService.get('key1')).toBeNull();
      });

      it('should return true for non-existent key in memory mode', async () => {
        // When Redis is disabled, delete always returns true for consistency
        const deleted = await cacheService.delete('nonexistent');
        expect(deleted).toBe(true);
      });
    });

    describe('clear', () => {
      it('should clear all entries', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key2', 'value2');
        
        await cacheService.clear();
        
        expect(await cacheService.get('key1')).toBeNull();
        expect(await cacheService.get('key2')).toBeNull();
        const stats = await cacheService.getStats();
        expect(stats.size).toBe(0);
      });
    });

    describe('getStats', () => {
      it('should return correct cache statistics', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key2', 'value2');
        
        const stats = await cacheService.getStats();
        
        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(3);
        expect(stats.backend).toBe('memory');
        expect(stats.connected).toBe(true);
      });
    });

    describe('getOrSet (cache-aside pattern)', () => {
      it('should return cached value if exists', async () => {
        await cacheService.set('key1', 'cachedValue');
        
        const fetcher = vi.fn().mockResolvedValue('fetchedValue');
        const result = await cacheService.getOrSet('key1', fetcher);
        
        expect(result).toBe('cachedValue');
        expect(fetcher).not.toHaveBeenCalled();
      });

      it('should fetch and cache if not exists', async () => {
        const fetcher = vi.fn().mockResolvedValue('fetchedValue');
        const result = await cacheService.getOrSet('key1', fetcher);
        
        expect(result).toBe('fetchedValue');
        expect(fetcher).toHaveBeenCalled();
        
        // Verify it was cached
        const cached = await cacheService.get('key1');
        expect(cached).toBe('fetchedValue');
      });

      it('should fetch again after cache expires', async () => {
        const fetcher = vi.fn()
          .mockResolvedValueOnce('first')
          .mockResolvedValueOnce('second');
        
        const result1 = await cacheService.getOrSet('key1', fetcher, 500);
        expect(result1).toBe('first');
        
        // Advance past TTL
        vi.advanceTimersByTime(600);
        
        const result2 = await cacheService.getOrSet('key1', fetcher);
        expect(result2).toBe('second');
        expect(fetcher).toHaveBeenCalledTimes(2);
      });
    });

    describe('isConnected', () => {
      it('should return false when Redis is disabled', () => {
        expect(cacheService.isConnected()).toBe(false);
      });
    });

    describe('disconnect', () => {
      it('should handle disconnect gracefully', async () => {
        await expect(cacheService.disconnect()).resolves.not.toThrow();
      });
    });
  });
});

describe('MemoryCache (CacheService legacy export)', () => {
  it('should be exported for backward compatibility', () => {
    expect(CacheService).toBeDefined();
  });

  it('should function as a memory cache', async () => {
    const cache = new CacheService<string>({ maxSize: 10, defaultTtl: 1000 });
    await cache.set('key', 'value');
    const result = await cache.get('key');
    expect(result).toBe('value');
  });
});
