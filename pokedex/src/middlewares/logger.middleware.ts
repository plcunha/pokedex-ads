/**
 * Request Logger Middleware
 * Structured JSON logging with request metrics tracking
 */

import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics.service';
import { config } from '../config';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  query?: Record<string, unknown>;
}

/**
 * Format log entry as JSON or colored text based on environment
 */
function formatLog(entry: LogEntry): string {
  if (config.app.isProduction) {
    // JSON format for production (easy to parse by log aggregators)
    return JSON.stringify(entry);
  }

  // Colored format for development
  const statusColor = entry.statusCode >= 500 ? '\x1b[31m' : // red
                      entry.statusCode >= 400 ? '\x1b[33m' : // yellow
                      entry.statusCode >= 300 ? '\x1b[36m' : // cyan
                      '\x1b[32m'; // green
  const reset = '\x1b[0m';
  
  return `${statusColor}${entry.statusCode}${reset} ${entry.method} ${entry.path} - ${entry.responseTime}ms`;
}

/**
 * Request logger middleware with metrics tracking
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Record metrics
    metricsService.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
    });

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
    };

    // Add extra info in production
    if (config.app.isProduction) {
      logEntry.userAgent = req.get('user-agent');
      logEntry.ip = req.ip || req.socket.remoteAddress;
      if (Object.keys(req.query).length > 0) {
        logEntry.query = req.query as Record<string, unknown>;
      }
    }

    // Log to console
    console.log(formatLog(logEntry));
  });

  next();
}
