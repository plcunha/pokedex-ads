/**
 * Request Logger Middleware
 * Simple request logging for development
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (config.app.isProduction) {
    return next();
  }

  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    
    console.log(
      `${statusColor}${status}\x1b[0m ${req.method} ${req.path} - ${duration}ms`
    );
  });

  next();
}
