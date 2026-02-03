/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../types';
import { config } from '../config';

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new NotFoundError(`Rota ${req.method} ${req.path} não encontrada`));
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let isOperational = false;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error in development or non-operational errors
  if (!config.app.isProduction || !isOperational) {
    console.error(`[Error] ${statusCode} - ${message}`);
    console.error(err.stack);
  }

  // Render error page or send JSON response
  const acceptsHtml = req.accepts('html');
  
  if (acceptsHtml) {
    res.status(statusCode).render('error', {
      statusCode,
      message,
      showStack: !config.app.isProduction,
      stack: err.stack,
    });
  } else {
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...((!config.app.isProduction) && { stack: err.stack }),
      },
    });
  }
}
