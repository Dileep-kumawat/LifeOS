import { Router } from 'express';
import passport from 'passport';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Email & Password Auth
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Google OAuth 2.0 via Passport.js
router.get('/google', AuthController.googleRedirect);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.APP_URL || 'http://localhost:5173'}/login?error=google_auth_failed`,
    session: true,
  }),
  AuthController.googleCallback,
);

// Authenticated Routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.get('/sessions', authenticate, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);

export default router;
