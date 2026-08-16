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
import { seedDefaultCategories } from "../services/financeCategory.js";

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
 *     description: Creates a user with email/password authentication and issues access/refresh tokens. The refresh token is set as an httpOnly cookie (`refreshToken`); the access token is returned in the body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterInput"
 *           examples:
 *             register:
 *               value:
 *                 email: jane@example.com
 *                 password: Secret12345
 *                 name: Jane Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthResponse"
 *             examples:
 *               registered:
 *                 value:
 *                   user:
 *                     id: 662c9f1e9f0b2a001c3d4e5f
 *                     email: jane@example.com
 *                     name: Jane Doe
 *                     role: user
 *                     emailVerified: false
 *                     status: active
 *                     createdAt: 2026-01-01T10:00:00.000Z
 *                   accessToken: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NjJjOWYxZSJ9.example-access-token
 *       400:
 *         description: Validation error (e.g. password shorter than 10 chars, or missing letter/number)
 *       409:
 *         description: Email already registered
 */
authRouter.post("/auth/register", validate(registerSchema), async (req: Request, res: Response) => {
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

    await seedDefaultCategories(user._id);

    const accessToken = generateAccessToken(user);
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const { rawToken } = await createRefreshToken(user._id.toString(), deviceInfo);

    setRefreshCookie(res, rawToken);

    return res.status(201).json({
      user: formatUserProfile(user),
      accessToken,
      refreshToken: rawToken
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "InternalServerError", message: "Failed to register user" });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     description: Authenticates user credentials with rate limiting and issues tokens. The refresh token is set as an httpOnly cookie (`refreshToken`).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginInput"
 *           examples:
 *             login:
 *               value:
 *                 email: jane@example.com
 *                 password: Secret12345
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthResponse"
 *             examples:
 *               loggedIn:
 *                 value:
 *                   user:
 *                     id: 662c9f1e9f0b2a001c3d4e5f
 *                     email: jane@example.com
 *                     name: Jane Doe
 *                     role: user
 *                     emailVerified: false
 *                     status: active
 *                     createdAt: 2026-01-01T10:00:00.000Z
 *                   accessToken: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NjJjOWYxZSJ9.example-access-token
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
        accessToken,
        refreshToken: rawToken
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
 *     description: |
 *       Rotates the refresh token cookie and issues a fresh access token.
 *       Rotation: each call consumes the presented refresh token and issues a
 *       NEW one (the old cookie value is invalidated immediately), so a token
 *       is single-use. The client must update its cookie from the Set-Cookie
 *       header on every refresh.
 *
 *       Reuse detection: if a rotated-out (already consumed) token is ever
 *       presented again, the server assumes it has been leaked and revokes the
 *       ENTIRE token family (every session for that user is invalidated) as a
 *       defensive security measure — the user must log in again everywhere.
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthResponse"
 *             examples:
 *               refreshed:
 *                 value:
 *                   user:
 *                     id: 662c9f1e9f0b2a001c3d4e5f
 *                     email: jane@example.com
 *                     name: Jane Doe
 *                     role: user
 *                     emailVerified: false
 *                     status: active
 *                     createdAt: 2026-01-01T10:00:00.000Z
 *                   accessToken: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NjJjOWYxZSJ9.example-refreshed-access-token
 *       401:
 *         description: Invalid, missing, or revoked refresh token (or user account inactive)
 */
authRouter.post("/auth/refresh", async (req: Request, res: Response) => {
  try {
    const rawToken =
      req.body?.refreshToken || (req.headers["x-refresh-token"] as string) || req.cookies?.refreshToken;
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
      accessToken,
      refreshToken: newRawToken
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
 *     description: Revokes current refresh token and clears refresh token cookie. Idempotent — succeeds even when no refresh cookie is present.
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Logged out successfully
 */
authRouter.post("/auth/logout", async (req: Request, res: Response) => {
  const rawToken =
    req.body?.refreshToken || (req.headers["x-refresh-token"] as string) || req.cookies?.refreshToken;
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
 *     description: Generates an expiring password reset token and dispatches reset link via email. Always returns 200 (even for unknown emails) to avoid leaking which addresses are registered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ForgotPasswordInput"
 *           examples:
 *             request:
 *               value:
 *                 email: jane@example.com
 *     responses:
 *       200:
 *         description: Reset email dispatch initiated (or email not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: If an account exists with that email, a password reset link has been sent.
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
 *     description: Validates reset token, updates password, and revokes all active refresh tokens for the user (forces re-login everywhere).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ResetPasswordInput"
 *           examples:
 *             reset:
 *               value:
 *                 token: 6f3b2c8d9e0a1f4b5c6d7e8f9a0b1c2d
 *                 password: NewSecret12345
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Password reset successful. Please log in with your new password.
 *       400:
 *         description: Invalid or expired token, or password fails validation rules
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: "#/components/schemas/UserProfile"
 *             examples:
 *               me:
 *                 value:
 *                   user:
 *                     id: 662c9f1e9f0b2a001c3d4e5f
 *                     email: jane@example.com
 *                     name: Jane Doe
 *                     role: user
 *                     emailVerified: false
 *                     status: active
 *                     createdAt: 2026-01-01T10:00:00.000Z
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Account scheduled for deletion. Your account will be permanently purged in 30 days.
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
 *     description: Returns active non-revoked refresh token sessions for the current user, newest first. Each session is the current one if its token hash matches the request's refresh cookie.
 *     responses:
 *       200:
 *         description: Sessions listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Session"
 *             examples:
 *               sessions:
 *                 value:
 *                   sessions:
 *                     - id: 662c9f1e9f0b2a001c3d4e70
 *                       deviceInfo: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0
 *                       issuedAt: 2026-01-02T09:15:00.000Z
 *                       expiresAt: 2026-01-16T09:15:00.000Z
 *                       isCurrent: true
 *                     - id: 662c9f1e9f0b2a001c3d4e71
 *                       deviceInfo: LifeOS iOS App
 *                       issuedAt: 2026-01-01T18:40:00.000Z
 *                       expiresAt: 2026-01-15T18:40:00.000Z
 *                       isCurrent: false
 *       401:
 *         description: Authentication required
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
 *     description: |
 *       Revokes a single active session (e.g. signing out an old device).
 *       Ownership is enforced server-side — a user can only revoke their own
 *       sessions. Presenting a session id that belongs to another user is
 *       indistinguishable from a missing session and returns 404 (preserving
 *       privacy), so no 403 is emitted for wrong-owner here. Authenticated
 *       requests without a valid session are still 401.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Session revoked successfully.
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Active session not found (or not owned by the caller)
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

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       description: Registration payload. Mirrors the Zod `registerSchema` in `@lifeos/shared`.
 *       required: [email, password, name]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Lowercased and trimmed before storage.
 *         password:
 *           type: string
 *           minLength: 10
 *           description: Must be at least 10 characters long and contain at least one letter and one number.
 *           example: Secret12345
 *         name:
 *           type: string
 *           minLength: 1
 *     LoginInput:
 *       type: object
 *       description: Login payload. Mirrors the Zod `loginSchema` in `@lifeos/shared`.
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 1
 *     ForgotPasswordInput:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     ResetPasswordInput:
 *       type: object
 *       required: [token, password]
 *       properties:
 *         token:
 *           type: string
 *           minLength: 1
 *         password:
 *           type: string
 *           minLength: 10
 *           description: Must be at least 10 chars long and contain at least one letter and one number.
 *           example: NewSecret12345
 *     UserProfile:
 *       type: object
 *       required: [id, email, name, role, emailVerified, status, createdAt]
 *       properties:
 *         id: { type: string }
 *         email: { type: string, format: email }
 *         name: { type: string }
 *         role: { type: string, enum: [user, admin] }
 *         emailVerified: { type: boolean }
 *         status: { type: string, enum: [active, soft_deleted] }
 *         createdAt: { type: string, format: date-time }
 *     AuthResponse:
 *       type: object
 *       description: Successful register/login/refresh response. The refresh token is issued as an httpOnly `refreshToken` cookie, not returned in the body.
 *       required: [user, accessToken]
 *       properties:
 *         user:
 *           $ref: "#/components/schemas/UserProfile"
 *         accessToken: { type: string }
 *     Session:
 *       type: object
 *       required: [id, deviceInfo, issuedAt, expiresAt]
 *       properties:
 *         id: { type: string }
 *         deviceInfo: { type: string }
 *         issuedAt: { type: string, format: date-time }
 *         expiresAt: { type: string, format: date-time }
 *         isCurrent: { type: boolean }
 */
