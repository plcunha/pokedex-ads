/**
 * Routes Index
 * Central route configuration
 */

import { Router } from 'express';
import pokemonRoutes from './pokemon.routes';

const router = Router();

// Mount pokemon routes at root
router.use('/', pokemonRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
