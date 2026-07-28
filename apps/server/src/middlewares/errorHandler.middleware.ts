import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors/AppError.js';
import { ApiResponse } from '../core/response/ApiResponse.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { HttpStatus } from '@lifeos/shared';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: any[] | undefined = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'ValidationError') {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Validation Error';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = 'Authentication token expired';
  } else {
    message = env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;
  }

  logger.error(`[API Error] ${req.method} ${req.originalUrl} - Status ${statusCode} - ${err.message}`);

  return ApiResponse.error(res, message, statusCode, errors);
};
