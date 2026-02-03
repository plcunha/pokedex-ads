/**
 * Pokédex Pro - Application Entry Point
 * 
 * A modern, professional Pokédex built with Express.js and TypeScript
 * 
 * @author Pokédex Team
 * @version 2.0.0
 */

import express, { Express } from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares';
import { rateLimiter } from './services';

/**
 * Configure advanced rate limiter with per-endpoint rules
 */
function configureRateLimiter(): void {
  // Apply endpoint-specific configurations
  const endpoints = config.rateLimit.endpoints;
  
  rateLimiter.addEndpointConfig(endpoints.search.pattern, {
    windowMs: endpoints.search.windowMs,
    maxRequests: endpoints.search.maxRequests,
    blockDurationMs: endpoints.search.blockDurationMs,
  });
  
  rateLimiter.addEndpointConfig(endpoints.pokemon.pattern, {
    windowMs: endpoints.pokemon.windowMs,
    maxRequests: endpoints.pokemon.maxRequests,
  });
  
  rateLimiter.addEndpointConfig(endpoints.system.pattern, {
    windowMs: endpoints.system.windowMs,
    maxRequests: endpoints.system.maxRequests,
  });
  
  rateLimiter.addEndpointConfig(endpoints.static.pattern, {
    windowMs: endpoints.static.windowMs,
    maxRequests: endpoints.static.maxRequests,
  });
}

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // Configure rate limiter with endpoint-specific rules
  configureRateLimiter();

  // ===========================================
  // Security Middlewares
  // ===========================================
  
  // Helmet - Security headers
  app.use(helmet(config.security.helmet));

  // Advanced sliding window rate limiting
  app.use(rateLimiter.middleware());

  // ===========================================
  // Performance Middlewares
  // ===========================================
  
  // Compression
  app.use(compression());

  // ===========================================
  // View Engine Setup
  // ===========================================
  
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  // ===========================================
  // Static Files
  // ===========================================
  
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.app.isProduction ? '1d' : 0,
  }));

  // ===========================================
  // Request Parsing
  // ===========================================
  
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ===========================================
  // Logging
  // ===========================================
  
  app.use(requestLogger);

  // ===========================================
  // Routes
  // ===========================================
  
  app.use('/', routes);

  // ===========================================
  // Error Handling
  // ===========================================
  
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
function startServer(): void {
  const app = createApp();

  app.listen(config.app.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║                                                  ║');
    console.log(`║   🎮 ${config.app.name} v${config.app.version}                      ║`);
    console.log('║                                                  ║');
    console.log(`║   🚀 Server:  http://localhost:${config.app.port}             ║`);
    console.log(`║   📦 Mode:    ${config.app.env.padEnd(29)}║`);
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(error.name, error.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(reason);
  process.exit(1);
});

// Start the application
startServer();

export { createApp };
