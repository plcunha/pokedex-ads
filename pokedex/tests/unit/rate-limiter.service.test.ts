/**
 * Rate Limiter Service Tests
 * Tests for sliding window rate limiting with per-endpoint configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterService } from '../../src/services/rate-limiter.service';

describe('RateLimiterService', () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = new RateLimiterService({
      windowMs: 1000, // 1 second for faster tests
      maxRequests: 5,
      blockDurationMs: 500,
    });
  });

  afterEach(() => {
    rateLimiter.stopCleanup();
    rateLimiter.resetAll();
  });

  describe('check', () => {
    it('should allow requests under the limit', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.check(mockReq);
        expect(result.allowed).toBe(true);
        expect(result.info.remaining).toBe(5 - i - 1);
      }
    });

    it('should block requests over the limit', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq);
      }

      // 6th request should be blocked
      const result = rateLimiter.check(mockReq);
      expect(result.allowed).toBe(false);
      expect(result.info.blocked).toBe(true);
      expect(result.info.remaining).toBe(0);
    });

    it('should track different IPs separately', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const mockReq2 = {
        ip: '192.168.1.1',
        path: '/test',
        socket: { remoteAddress: '192.168.1.1' },
      } as unknown as Request;

      // Exhaust limit for first IP
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq1);
      }

      // First IP should be blocked
      expect(rateLimiter.check(mockReq1).allowed).toBe(false);

      // Second IP should still be allowed
      expect(rateLimiter.check(mockReq2).allowed).toBe(true);
    });

    it('should track different paths separately', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        path: '/path1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const mockReq2 = {
        ip: '127.0.0.1',
        path: '/path2',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Exhaust limit for first path
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq1);
      }

      // First path should be blocked
      expect(rateLimiter.check(mockReq1).allowed).toBe(false);

      // Second path should still be allowed
      expect(rateLimiter.check(mockReq2).allowed).toBe(true);
    });

    it('should normalize pokemon paths', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        path: '/pokemon/pikachu',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const mockReq2 = {
        ip: '127.0.0.1',
        path: '/pokemon/charizard',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Make requests to different pokemon
      for (let i = 0; i < 3; i++) {
        rateLimiter.check(mockReq1);
      }
      for (let i = 0; i < 2; i++) {
        rateLimiter.check(mockReq2);
      }

      // Both should count towards same limit (normalized path)
      const result = rateLimiter.check(mockReq1);
      expect(result.allowed).toBe(false);
    });

    it('should reset after window expires', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq);
      }
      expect(rateLimiter.check(mockReq).allowed).toBe(false);

      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should be allowed again
      expect(rateLimiter.check(mockReq).allowed).toBe(true);
    });
  });

  describe('addEndpointConfig', () => {
    it('should apply endpoint-specific limits', () => {
      rateLimiter.addEndpointConfig('/api', {
        maxRequests: 2,
      });

      const mockReq = {
        ip: '127.0.0.1',
        path: '/api/data',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Should allow only 2 requests for /api
      expect(rateLimiter.check(mockReq).allowed).toBe(true);
      expect(rateLimiter.check(mockReq).allowed).toBe(true);
      expect(rateLimiter.check(mockReq).allowed).toBe(false);
    });

    it('should apply regex patterns', () => {
      rateLimiter.addEndpointConfig(/^\/search/, {
        maxRequests: 3,
      });

      const mockReq = {
        ip: '127.0.0.1',
        path: '/search?q=pikachu',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      for (let i = 0; i < 3; i++) {
        expect(rateLimiter.check(mockReq).allowed).toBe(true);
      }
      expect(rateLimiter.check(mockReq).allowed).toBe(false);
    });
  });

  describe('middleware', () => {
    it('should set rate limit headers', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
        accepts: vi.fn().mockReturnValue(false),
      } as unknown as Request;

      const headers: Record<string, string | number> = {};
      const mockRes = {
        setHeader: vi.fn((key: string, value: string | number) => {
          headers[key] = value;
        }),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        render: vi.fn(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      const middleware = rateLimiter.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(headers['X-RateLimit-Limit']).toBe(5);
      expect(headers['X-RateLimit-Remaining']).toBe(4);
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 429 when rate limited', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
        accepts: vi.fn().mockReturnValue(false),
      } as unknown as Request;

      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        render: vi.fn(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;
      const middleware = rateLimiter.middleware();

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        middleware(mockReq, mockRes, mockNext);
      }

      // Reset mocks for final request
      vi.clearAllMocks();

      // This should be blocked
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should render HTML error for browser requests', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
        accepts: vi.fn().mockReturnValue(true),
      } as unknown as Request;

      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        render: vi.fn(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;
      const middleware = rateLimiter.middleware();

      // Exhaust limit
      for (let i = 0; i < 6; i++) {
        middleware(mockReq, mockRes, mockNext);
      }

      expect(mockRes.render).toHaveBeenCalledWith('error', expect.objectContaining({
        statusCode: 429,
      }));
    });
  });

  describe('getInfo', () => {
    it('should return null for unknown key', () => {
      expect(rateLimiter.getInfo('unknown:key')).toBeNull();
    });

    it('should return rate limit info for existing key', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      rateLimiter.check(mockReq);
      rateLimiter.check(mockReq);

      const info = rateLimiter.getInfo('127.0.0.1:/test');
      expect(info).not.toBeNull();
      expect(info?.current).toBe(2);
      expect(info?.limit).toBe(5);
      expect(info?.remaining).toBe(3);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for specific key', () => {
      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq);
      }
      expect(rateLimiter.check(mockReq).allowed).toBe(false);

      // Reset the key
      rateLimiter.reset('127.0.0.1:/test');

      // Should be allowed again
      expect(rateLimiter.check(mockReq).allowed).toBe(true);
    });
  });

  describe('resetAll', () => {
    it('should reset all rate limits', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        path: '/test1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const mockReq2 = {
        ip: '127.0.0.2',
        path: '/test2',
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      // Exhaust limits
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(mockReq1);
        rateLimiter.check(mockReq2);
      }

      // Both should be blocked
      expect(rateLimiter.check(mockReq1).allowed).toBe(false);
      expect(rateLimiter.check(mockReq2).allowed).toBe(false);

      // Reset all
      rateLimiter.resetAll();

      // Both should be allowed
      expect(rateLimiter.check(mockReq1).allowed).toBe(true);
      expect(rateLimiter.check(mockReq2).allowed).toBe(true);
    });
  });

  describe('getAllEntries', () => {
    it('should return all tracked entries', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        path: '/test1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const mockReq2 = {
        ip: '127.0.0.2',
        path: '/test2',
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      rateLimiter.check(mockReq1);
      rateLimiter.check(mockReq2);
      rateLimiter.check(mockReq2);

      const entries = rateLimiter.getAllEntries();
      expect(entries.size).toBe(2);
      expect(entries.get('127.0.0.1:/test1')?.current).toBe(1);
      expect(entries.get('127.0.0.2:/test2')?.current).toBe(2);
    });
  });
});
