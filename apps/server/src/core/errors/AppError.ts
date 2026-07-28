import { HttpStatus } from '@lifeos/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: any[],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, errors?: any[]): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, errors);
  }

  public static unauthorized(message: string = 'Unauthorized access'): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED);
  }

  public static forbidden(message: string = 'Forbidden resource'): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN);
  }

  public static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, HttpStatus.NOT_FOUND);
  }

  public static conflict(message: string): AppError {
    return new AppError(message, HttpStatus.CONFLICT);
  }

  public static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, false);
  }
}
