import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@lifeos/shared';
import { AppError } from '../core/errors/AppError.js';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Role '${req.user.role}' is not authorized to access this resource`),
      );
    }

    next();
  };
};
