/**
 * Error Middleware Tests
 * Tests the error handling middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../src/middlewares/error.middleware';
import { AppError, NotFoundError } from '../../src/types';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      method: 'GET',
      path: '/test',
      accepts: vi.fn().mockReturnValue('text/html'),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError with route info', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/unknown';

      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Rota POST /api/unknown não encontrada');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError and render HTML error page', () => {
      const error = new AppError('Test error', 400);
      (mockRequest.accepts as jest.Mock).mockReturnValue('text/html');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith('error', expect.objectContaining({
        statusCode: 400,
        message: 'Test error',
      }));
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('Pokémon not found');
      (mockRequest.accepts as jest.Mock).mockReturnValue('text/html');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Something went wrong');
      (mockRequest.accepts as jest.Mock).mockReturnValue('text/html');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.render).toHaveBeenCalledWith('error', expect.objectContaining({
        statusCode: 500,
        message: 'Erro interno do servidor',
      }));
    });

    it('should return JSON response when client does not accept HTML', () => {
      const error = new AppError('API Error', 400);
      (mockRequest.accepts as jest.Mock).mockReturnValue(false);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'API Error',
        }),
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new AppError('Dev error', 400);
      error.stack = 'Error stack trace';
      (mockRequest.accepts as jest.Mock).mockReturnValue(false);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Dev error',
          stack: 'Error stack trace',
        }),
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Re-import to get fresh config
      const error = new AppError('Prod error', 400);
      error.stack = 'Error stack trace';
      (mockRequest.accepts as jest.Mock).mockReturnValue(false);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // In production, stack should not be included for operational errors
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('AppError', () => {
  it('should create error with default properties', () => {
    const error = new AppError('Test message', 400);
    
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('AppError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should allow custom isOperational flag', () => {
    const error = new AppError('Critical error', 500, false);
    
    expect(error.isOperational).toBe(false);
  });

  it('should capture stack trace', () => {
    const error = new AppError('Error with stack', 500);
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});
