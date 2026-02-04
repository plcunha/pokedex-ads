/**
 * Integration Tests for API Routes
 * Tests the full HTTP request/response cycle
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { createApp } from '../../src/app';

// Mock axios to avoid real API calls during tests
vi.mock('axios', async () => {
  const actualAxios = await vi.importActual<typeof import('axios')>('axios');
  
  const mockPokemonList = {
    count: 1302,
    next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
    previous: null,
    results: [
      { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
      { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
      { name: 'charmeleon', url: 'https://pokeapi.co/api/v2/pokemon/5/' },
    ],
  };

  const mockPikachuDetail = {
    id: 25,
    name: 'pikachu',
    height: 4,
    weight: 60,
    base_experience: 112,
    stats: [
      { base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } },
      { base_stat: 55, effort: 0, stat: { name: 'attack', url: '' } },
      { base_stat: 40, effort: 0, stat: { name: 'defense', url: '' } },
      { base_stat: 50, effort: 0, stat: { name: 'special-attack', url: '' } },
      { base_stat: 50, effort: 0, stat: { name: 'special-defense', url: '' } },
      { base_stat: 90, effort: 2, stat: { name: 'speed', url: '' } },
    ],
    types: [{ slot: 1, type: { name: 'electric', url: '' } }],
    abilities: [
      { ability: { name: 'static', url: '' }, is_hidden: false, slot: 1 },
    ],
    sprites: {
      front_default: 'https://example.com/pikachu.png',
      front_shiny: 'https://example.com/pikachu-shiny.png',
      other: {
        'official-artwork': {
          front_default: 'https://example.com/pikachu-artwork.png',
          front_shiny: 'https://example.com/pikachu-artwork-shiny.png',
        },
      },
    },
  };

  const mockAxiosInstance = {
    get: vi.fn((url: string) => {
      if (url === '/pokemon' || url.startsWith('/pokemon?')) {
        return Promise.resolve({ data: mockPokemonList });
      }
      if (url === '/pokemon/pikachu' || url === '/pokemon/25') {
        return Promise.resolve({ data: mockPikachuDetail });
      }
      if (url.startsWith('/pokemon/')) {
        const name = url.replace('/pokemon/', '');
        if (name === 'notfound' || name === 'xyz') {
          const error = new Error('Not Found') as Error & { response: { status: number } };
          error.response = { status: 404 };
          return Promise.reject(error);
        }
      }
      return Promise.resolve({ data: mockPokemonList });
    }),
  };

  return {
    ...actualAxios,
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: (error: unknown): error is Error & { response?: { status: number } } => {
        return error instanceof Error && 'response' in error;
      },
    },
  };
});

describe('API Routes Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET / (Home page)', () => {
    it('should return HTML page with pokemon list', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should handle pagination query params', async () => {
      const response = await request(app)
        .get('/?page=2&limit=10')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should handle invalid page parameter gracefully', async () => {
      const response = await request(app)
        .get('/?page=-1')
        .expect(200);

      // Should default to page 1
      expect(response.text).toContain('<!DOCTYPE html>');
    });
  });

  describe('GET /pokemon/:name', () => {
    it('should return pokemon detail page', async () => {
      const response = await request(app)
        .get('/pokemon/pikachu')
        .expect('Content-Type', /html/)
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should handle non-existent pokemon', async () => {
      const response = await request(app)
        .get('/pokemon/notfound')
        .expect(404);

      // Should show error page
      expect(response.text).toContain('<!DOCTYPE html>');
    });
  });

  describe('GET /search', () => {
    it('should redirect to home when no query provided', async () => {
      const response = await request(app)
        .get('/search')
        .expect(302);

      expect(response.headers.location).toBe('/');
    });

    it('should redirect to home when query is empty', async () => {
      const response = await request(app)
        .get('/search?query=')
        .expect(302);

      expect(response.headers.location).toBe('/');
    });

    it('should redirect to pokemon detail on exact match', async () => {
      const response = await request(app)
        .get('/search?query=pikachu')
        .expect(302);

      expect(response.headers.location).toBe('/pokemon/pikachu');
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.text).toContain('<!DOCTYPE html>');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers via Helmet', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet sets various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Rate limiter adds standard headers (X-RateLimit-* format, lowercase in response)
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
});
