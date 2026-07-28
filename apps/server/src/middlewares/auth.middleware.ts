import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors/AppError.js';
import { verifyJwt } from '../utils/jwt.util.js';
import { UserRole } from '@lifeos/shared';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticateJwt = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No authorization token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyJwt(token);
    req.user = payload as AuthenticatedRequest['user'];
    return next();
  } catch (_error) {
    return next(AppError.unauthorized('Invalid or expired authentication token'));
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }

    return next();
  };
};
