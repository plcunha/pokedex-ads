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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
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
