/**
 * Type Definitions Index
 * Central export point for all application types
 */

export * from './pokemon.types';

// Express request extensions
import { Request } from 'express';

export interface TypedRequest<T = unknown> extends Request {
  body: T;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface SearchQuery {
  query?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Dados inválidos') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
