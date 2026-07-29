import { Request, Response, NextFunction } from 'express';
import { JwtUtil, JwtPayload } from '../utils/jwt.util.js';
import { AppError } from '../core/errors/AppError.js';
import { SessionModel } from '../features/auth/models/Session.model.js';
import { UserModel } from '../features/auth/models/User.model.js';
import type { IUserDocument } from '../features/auth/models/User.model.js';

// Extend Express.User (set by @types/passport) to include our document shape
declare global {
  namespace Express {
    interface User extends IUserDocument {}

    interface Request {
      jwtPayload?: JwtPayload;
      sessionId?: string;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Access token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    let payload: JwtPayload;

    try {
      payload = JwtUtil.verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Access token expired');
      }
      throw AppError.unauthorized('Invalid access token');
    }

    // Validate active session in DB
    const session = await SessionModel.findById(payload.sessionId);
    if (!session || !session.isValid) {
      throw AppError.unauthorized('Session has expired or been revoked');
    }

    // Update last active time
    session.lastActiveAt = new Date();
    await session.save();

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw AppError.unauthorized('Authenticated user no longer exists');
    }

    req.user = user;
    req.jwtPayload = payload;
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    next(error);
  }
};
