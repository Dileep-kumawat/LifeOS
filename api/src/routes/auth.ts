import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "@lifeos/shared";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { validate } from "../middleware/validate.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  clearRefreshCookie,
  createRefreshToken,
  generateAccessToken,
  hashToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  setRefreshCookie
} from "../auth/tokenService.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import { scheduleAccountPurge } from "../services/accountPurgeQueue.js";

export const authRouter = Router();

const BCRYPT_SALT_ROUNDS = 12;

function formatUserProfile(user: any) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt.toISOString()
  };
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a user with email/password authentication and issues access/refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Secret12345
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already registered
 *       400:
 *         description: Validation error
 */
authRouter.post(
  "/auth/register",
  validate(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: "Conflict",
          message: "An account with this email address already exists."
        });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      const user = await User.create({
        email,
        passwordHash,
        name,
        role: "user",
        emailVerified: false,
        status: "active"
      });

      const accessToken = generateAccessToken(user);
      const deviceInfo = req.headers["user-agent"] || "Unknown Device";
      const { rawToken } = await createRefreshToken(user._id.toString(), deviceInfo);

      setRefreshCookie(res, rawToken);

      return res.status(201).json({
        user: formatUserProfile(user),
        accessToken
      });
    } catch (err) {
      return res.status(500).json({ error: "InternalServerError", message: "Failed to register user" });
    }
  }
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     description: Authenticates user credentials with rate limiting and issues tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Secret12345
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Rate limit exceeded
 */
authRouter.post(
  "/auth/login",
  validate(loginSchema),
  loginRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user || user.status === "soft_deleted") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password."
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password."
        });
      }

      const accessToken = generateAccessToken(user);
      const deviceInfo = req.headers["user-agent"] || "Unknown Device";
      const { rawToken } = await createRefreshToken(user._id.toString(), deviceInfo);

      setRefreshCookie(res, rawToken);

      return res.json({
        user: formatUserProfile(user),
        accessToken
      });
    } catch (err) {
      return res.status(500).json({ error: "InternalServerError", message: "Failed to log in" });
    }
  }
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Rotates refresh token cookie and issues new access token. Revokes token family on reuse.
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Invalid or revoked refresh token
 */
authRouter.post("/auth/refresh", async (req: Request, res: Response) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Refresh token missing."
      });
    }

    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const { newRawToken, userId } = await rotateRefreshToken(rawToken, deviceInfo);

    const user = await User.findById(userId);
    if (!user || user.status === "soft_deleted") {
      clearRefreshCookie(res);
      return res.status(401).json({
        error: "Unauthorized",
        message: "User account inactive or deleted."
      });
    }

    const accessToken = generateAccessToken(user);
    setRefreshCookie(res, newRawToken);

    return res.json({
      user: formatUserProfile(user),
      accessToken
    });
  } catch (err: any) {
    clearRefreshCookie(res);
    return res.status(401).json({
      error: "Unauthorized",
      message: err.message || "Invalid refresh token."
    });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out user
 *     description: Revokes current refresh token and clears refresh token cookie.
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
authRouter.post("/auth/logout", async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }
  clearRefreshCookie(res);
  return res.json({ message: "Logged out successfully" });
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     description: Generates an expiring password reset token and dispatches reset link via email. Always returns 200.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset email dispatch initiated
 */
authRouter.post(
  "/auth/forgot-password",
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email, status: "active" });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const passwordResetTokenHash = hashToken(resetToken);
      const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetTokenHash = passwordResetTokenHash;
      user.passwordResetExpiresAt = passwordResetExpiresAt;
      await user.save();

      await sendPasswordResetEmail({ toEmail: user.email, resetToken });
    }

    return res.json({
      message: "If an account exists with that email, a password reset link has been sent."
    });
  }
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     description: Validates reset token, updates password, and revokes all active refresh tokens for the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: NewSecret12345
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
authRouter.post(
  "/auth/reset-password",
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      status: "active"
    });

    if (!user) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Invalid or expired password reset token."
      });
    }

    user.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    // Force re-login everywhere after password reset
    await revokeAllUserTokens(user._id.toString());
    clearRefreshCookie(res);

    return res.json({
      message: "Password reset successful. Please log in with your new password."
    });
  }
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     responses:
 *       200:
 *         description: Profile returned successfully
 *       401:
 *         description: Authentication required
 */
authRouter.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({
    user: formatUserProfile(user)
  });
});

/**
 * @openapi
 * /auth/account:
 *   delete:
 *     tags: [Auth]
 *     summary: Soft-delete user account
 *     description: Soft-deletes user account immediately, revokes all sessions, and enqueues a 30-day hard-purge job.
 *     responses:
 *       200:
 *         description: Account scheduled for deletion
 *       401:
 *         description: Authentication required
 */
authRouter.delete("/auth/account", requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const userId = user._id.toString();

  user.status = "soft_deleted";
  user.deletedAt = new Date();
  await user.save();

  await revokeAllUserTokens(userId);
  await scheduleAccountPurge(userId);
  clearRefreshCookie(res);

  return res.json({
    message: "Account scheduled for deletion. Your account will be permanently purged in 30 days."
  });
});

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: List active user sessions
 *     description: Returns active non-revoked refresh token sessions for the current user.
 *     responses:
 *       200:
 *         description: Sessions listed successfully
 */
authRouter.get("/auth/sessions", requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const userId = user._id;
  const sessions = await RefreshToken.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ issuedAt: -1 });

  const currentCookieHash = req.cookies?.refreshToken ? hashToken(req.cookies.refreshToken) : null;

  const formattedSessions = sessions.map((s) => ({
    id: s._id.toString(),
    deviceInfo: s.deviceInfo,
    issuedAt: s.issuedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    isCurrent: currentCookieHash ? s.tokenHash === currentCookieHash : false
  }));

  return res.json({ sessions: formattedSessions });
});

/**
 * @openapi
 * /auth/sessions/{id}:
 *   delete:
 *     tags: [Auth]
 *     summary: Revoke a specific active session
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       404:
 *         description: Session not found
 */
authRouter.delete("/auth/sessions/:id", requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const session = await RefreshToken.findOne({
    _id: id,
    userId: user._id,
    revokedAt: null
  });

  if (!session) {
    return res.status(404).json({ error: "NotFound", message: "Active session not found." });
  }

  session.revokedAt = new Date();
  await session.save();

  return res.json({ message: "Session revoked successfully." });
});
