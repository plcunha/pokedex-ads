/**
 * Swagger/OpenAPI Configuration
 * Documentation for the Pokédex Pro API
 */

import swaggerJSDoc from 'swagger-jsdoc';

// Use direct values to avoid circular dependency with config/index.ts
const APP_VERSION = '2.0.0';
const APP_PORT = parseInt(process.env.PORT || '3000', 10);
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MINUTES = 15;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Pokédex Pro API',
    version: APP_VERSION,
    description: `
A modern, professional Pokédex API built with Express.js and TypeScript.

## Features
- 🎮 Browse all Pokémon with pagination
- 🔍 Search Pokémon by name
- 📊 Detailed stats, types, and abilities
- 🖼️ Official artwork images
- ⚡ Fast response with intelligent caching

## Rate Limiting
API requests are limited to ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MINUTES} minutes.
    `,
    contact: {
      name: 'Pokédex Team',
      url: 'https://github.com/plcunha/pokedex-ads',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${APP_PORT}`,
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Pokemon',
      description: 'Pokémon browsing and search operations',
    },
    {
      name: 'Health',
      description: 'API health check endpoints',
    },
  ],
};

const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/config/swagger-schemas.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
