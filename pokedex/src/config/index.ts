/**
 * Application Configuration
 * Centralized configuration management with environment variable support
 */

export const config = {
  app: {
    name: 'Pokédex Pro',
    version: '2.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  api: {
    baseUrl: 'https://pokeapi.co/api/v2',
    timeout: 10000,
    defaultLimit: 20,
    maxLimit: 151,
  },

  cache: {
    ttl: 1000 * 60 * 30, // 30 minutes
    maxSize: 500,
  },

  rateLimit: {
    // Global defaults
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      blockDurationMs: 60 * 1000, // 1 minute block
      message: 'Muitas requisições, tente novamente mais tarde',
    },
    // Per-endpoint overrides
    endpoints: {
      // Search endpoint - more restrictive (prevent abuse)
      search: {
        pattern: /^\/search/,
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 30,
        blockDurationMs: 30 * 1000,
      },
      // Pokemon detail pages - moderate
      pokemon: {
        pattern: /^\/pokemon\//,
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 60,
      },
      // Health/metrics endpoints - lenient (for monitoring)
      system: {
        pattern: /^\/(health|metrics)/,
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 120,
      },
      // Static assets - very lenient
      static: {
        pattern: /\.(css|js|png|jpg|svg|ico|woff|woff2)$/,
        windowMs: 1 * 60 * 1000,
        maxRequests: 500,
      },
    },
  },

  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'https://raw.githubusercontent.com', 'data:', 'https://validator.swagger.io'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    },
  },
} as const;

export type Config = typeof config;

export { swaggerSpec } from './swagger';
