/**
 * Routes Index
 * Central route configuration with health and metrics endpoints
 */

import { Router, Request, Response } from 'express';
import pokemonRoutes from './pokemon.routes';
import { metricsService } from '../services/metrics.service';
import { config } from '../config';

const router = Router();

// Mount pokemon routes at root
router.use('/', pokemonRoutes);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns application health status with system information
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       description: Used heap in MB
 *                     total:
 *                       type: number
 *                       description: Total heap in MB
 */
router.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0',
    environment: config.app.env,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
  });
});

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Application metrics endpoint
 *     description: Returns request metrics, response times, and error rates
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Application metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     byStatus:
 *                       type: object
 *                     byMethod:
 *                       type: object
 *                     byPath:
 *                       type: object
 *                 responseTime:
 *                   type: object
 *                   properties:
 *                     avg:
 *                       type: number
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                     p95:
 *                       type: number
 *                 errors:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     rate:
 *                       type: number
 *                 uptime:
 *                   type: number
 *                 startTime:
 *                   type: string
 *                   format: date-time
 */
router.get('/metrics', (req: Request, res: Response) => {
  res.json(metricsService.getSummary());
});

export default router;
