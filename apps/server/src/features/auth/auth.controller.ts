import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../core/response/ApiResponse.js';
import { HttpStatus } from '@lifeos/shared';
import { IUserDocument } from './models/User.model.js';
import { env } from '../../config/env.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');
      const result = await AuthService.register(req.body, ip, userAgent);
      ApiResponse.success(res, result, 'Account created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');
      const result = await AuthService.login(req.body, ip, userAgent);
      ApiResponse.success(res, result, 'Logged in successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static googleRedirect = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  });

  public static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUserDocument | undefined;
      if (!user) {
        return res.redirect(`${env.APP_URL}/login?error=google_auth_failed`) as any;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');
      const tokens = await AuthService.issueTokensAndSession(user, ip, userAgent);

      // Destroy the oauth session immediately after obtaining JWT tokens
      req.logout((err) => {
        if (err) next(err);
      });

      const redirectUrl = new URL(`${env.APP_URL}/login`);
      redirectUrl.searchParams.set('token', tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenStr = req.body.refreshToken || req.headers['x-refresh-token'];
      const result = await AuthService.refreshToken(refreshTokenStr);
      ApiResponse.success(res, result, 'Token refreshed successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.sessionId;
      const refreshTokenStr = req.body.refreshToken;
      if (sessionId) {
        await AuthService.logout(sessionId, refreshTokenStr);
      }
      ApiResponse.success(res, null, 'Logged out successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ApiResponse.success(res, req.user?.toJSON(), 'User profile fetched successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const sessions = await AuthService.getSessions(userId);
      ApiResponse.success(res, sessions, 'Active sessions retrieved', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const sessionId = req.params.sessionId;
      await AuthService.revokeSession(userId, sessionId);
      ApiResponse.success(res, null, 'Session revoked', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
