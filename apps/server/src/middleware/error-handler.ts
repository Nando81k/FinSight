import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong!';
  }

  res.status(statusCode).json({
    error: {
      message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};