import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  googleLinkSchema,
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
import { googleAuthService, type GoogleVerifiedIdentity } from "../auth/googleAuthService.js";
import { env } from "../config/env.js";
import { logger } from "../logger.js";
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
    createdAt: user.createdAt.toISOString(),
    googleId: user.googleId || null,
    hasPassword: Boolean(user.passwordHash)
  };
}

export async function authenticateOrRegisterGoogleUser(
  identity: GoogleVerifiedIdentity,
  deviceInfo: string
): Promise<{ user: any; accessToken: string; refreshToken: string; isNewUser: boolean }> {
  const { sub, email, name } = identity;

  // 1. Look up user by Google Subject ID (immutable identity)
  let user = await User.findOne({ googleId: sub });

  if (user) {
    if (user.status === "soft_deleted") {
      throw { status: 401, error: "Unauthorized", message: "User account inactive or deleted." };
    }

    const accessToken = generateAccessToken(user);
    const { rawToken } = await createRefreshToken(user._id.toString(), deviceInfo);
    return { user, accessToken, refreshToken: rawToken, isNewUser: false };
  }

  // 2. Not found by googleId -> Check if account exists with this email
  const existingEmailUser = await User.findOne({ email });
  if (existingEmailUser) {
    // Existing password account exists, but Google is not linked to it.
    // Safe Account Linking Policy: Reject unauthenticated auto-merge to prevent account takeover.
    throw {
      status: 409,
      error: "AccountLinkingRequired",
      message:
        "An account with this email address already exists. Please log in with your password and link your Google account in Settings."
    };
  }

  // 3. New User Registration via Google OAuth
  user = await User.create({
    email,
    name,
    googleId: sub,
    passwordHash: null,
    role: "user",
    emailVerified: true,
    status: "active"
  });

  await seedDefaultCategories(user._id);

  const accessToken = generateAccessToken(user);
  const { rawToken } = await createRefreshToken(user._id.toString(), deviceInfo);

  return { user, accessToken, refreshToken: rawToken, isNewUser: true };
}

export async function linkGoogleAccountToUser(
  userId: string,
  identity: GoogleVerifiedIdentity
): Promise<any> {
  const { sub } = identity;

  // Check if another account already has this googleId
  const existingOwner = await User.findOne({ googleId: sub });
  if (existingOwner && existingOwner._id.toString() !== userId) {
    throw {
      status: 409,
      error: "Conflict",
      message: "This Google account is already linked to another LifeOS user."
    };
  }

  const user = await User.findById(userId);
  if (!user || user.status === "soft_deleted") {
    throw { status: 401, error: "Unauthorized", message: "User account inactive or deleted." };
  }

  user.googleId = sub;
  await user.save();

  return user;
}

export async function unlinkGoogleAccountFromUser(userId: string): Promise<any> {
  const user = await User.findById(userId);
  if (!user || user.status === "soft_deleted") {
    throw { status: 401, error: "Unauthorized", message: "User account inactive or deleted." };
  }

  if (!user.googleId) {
    throw {
      status: 400,
      error: "BadRequest",
      message: "No Google account is currently linked."
    };
  }

  if (!user.passwordHash) {
    throw {
      status: 400,
      error: "BadRequest",
      message: "Cannot unlink Google account without setting a password first."
    };
  }

  user.googleId = null;
  await user.save();

  return user;
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
  } catch (_err) {
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
      if (!user || user.status === "soft_deleted" || !user.passwordHash) {
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
    } catch (_err) {
      return res.status(500).json({ error: "InternalServerError", message: "Failed to log in" });
    }
  }
);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with Google ID token
 *     description: |
 *       Verifies a cryptographically signed Google ID token (OpenID Connect), resolves or registers
 *       the LifeOS user account, and issues a standard LifeOS access token and rotating refresh token cookie.
 *       Safe Account Linking: If an existing password user exists with the same email but Google is unlinked,
 *       returns 409 Conflict (AccountLinkingRequired) requiring authentication before linking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/GoogleAuthInput"
 *           examples:
 *             googleLogin:
 *               value:
 *                 idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1In0.example-google-id-token"
 *     responses:
 *       200:
 *         description: Google authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthResponse"
 *       201:
 *         description: New user registered successfully via Google
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AuthResponse"
 *       400:
 *         description: Malformed or missing Google ID token
 *       401:
 *         description: Invalid, expired, or unverified Google token
 *       409:
 *         description: Account linking required (existing email/password account exists)
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth redirect flow (Web)
 *     description: |
 *       Generates a cryptographically secure CSRF state token stored in an httpOnly cookie,
 *       and redirects the user's browser to Google's OAuth2 authorization page.
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth authorization endpoint
 *       503:
 *         description: Google OAuth is not configured on the server
 */
authRouter.post(
  "/auth/google",
  validate(googleAuthSchema),
  loginRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const verifiedIdentity = await googleAuthService.verifyIdToken(idToken);
      const deviceInfo = req.headers["user-agent"] || "Unknown Device";

      const result = await authenticateOrRegisterGoogleUser(verifiedIdentity, deviceInfo);
      setRefreshCookie(res, result.refreshToken);

      return res.status(result.isNewUser ? 201 : 200).json({
        user: formatUserProfile(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({
          error: err.error || "AuthenticationError",
          message: err.message
        });
      }
      return res.status(401).json({
        error: "Unauthorized",
        message: err.message || "Google authentication failed."
      });
    }
  }
);

authRouter.get("/auth/google", (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: "ServiceUnavailable",
      message: "Google OAuth is not configured on this server."
    });
  }

  const rawState = {
    csrf: crypto.randomBytes(24).toString("hex"),
    returnUrl: (req.query.return_url as string) || (req.query.redirect_uri as string) || null
  };
  const state = Buffer.from(JSON.stringify(rawState)).toString("base64url");

  res.cookie("oauth_state", rawState.csrf, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: "/"
  });

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set("redirect_uri", env.GOOGLE_CALLBACK_URL);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return res.redirect(googleAuthUrl.toString());
});

function sendOAuthResponse(res: Response, targetUrl: string) {
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    return res.redirect(targetUrl);
  }

  const escapedUrl = targetUrl.replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authenticating with LifeOS...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f7f7f5;
      color: #37352f;
      text-align: center;
    }
    .card {
      background: #ffffff;
      padding: 2.5rem 2rem;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
      max-width: 380px;
      margin: 1.5rem;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3.5px solid #eaeaea;
      border-top-color: #0070f3;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 1.25rem; margin: 0 0 0.5rem; font-weight: 600; }
    p { font-size: 0.9rem; color: #6b7280; margin: 0 0 1.5rem; line-height: 1.4; }
    .btn {
      display: inline-block;
      background-color: #0070f3;
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authenticating...</h2>
    <p>Returning you back to the LifeOS app.</p>
    <a class="btn" href="${escapedUrl}">Open LifeOS App</a>
  </div>
  <script>
    window.location.replace(${JSON.stringify(targetUrl)});
    setTimeout(function() {
      window.location.href = ${JSON.stringify(targetUrl)};
    }, 150);
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth redirect callback (Web & Mobile)
 *     description: |
 *       Handles the callback redirect from Google. Verifies OAuth CSRF state parameter against the cookie,
 *       exchanges authorization code for tokens, verifies identity, and redirects to frontend or mobile app with session established.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Google authorization code
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: OAuth CSRF state token
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: OAuth error code if user denied consent
 *     responses:
 *       302:
 *         description: Redirects to frontend with success or error parameters
 */
authRouter.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  let returnUrl = `${env.FRONTEND_URL}/login`;
  let csrfToken = "";

  if (state && typeof state === "string") {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      csrfToken = parsed.csrf || "";
      if (parsed.returnUrl) {
        returnUrl = parsed.returnUrl;
      }
    } catch {
      csrfToken = state;
    }
  }

  const buildRedirect = (queryParams: Record<string, string>) => {
    const separator = returnUrl.includes("?") ? "&" : "?";
    const queryString = new URLSearchParams(queryParams).toString();
    return `${returnUrl}${separator}${queryString}`;
  };

  if (error) {
    return sendOAuthResponse(res, buildRedirect({ error: String(error) }));
  }

  const storedState = req.cookies?.oauth_state;
  res.clearCookie("oauth_state", { path: "/" });

  if (storedState && csrfToken && csrfToken !== storedState) {
    return sendOAuthResponse(res, buildRedirect({ error: "invalid_oauth_state" }));
  }

  if (!code || typeof code !== "string") {
    return sendOAuthResponse(res, buildRedirect({ error: "missing_authorization_code" }));
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID || "",
        client_secret: env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text().catch(() => "");
      logger.warn({ errText }, "Google token exchange failed");
      return sendOAuthResponse(res, buildRedirect({ error: "token_exchange_failed" }));
    }

    const tokenData: any = await tokenResponse.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      return sendOAuthResponse(res, buildRedirect({ error: "missing_id_token" }));
    }

    const verifiedIdentity = await googleAuthService.verifyIdToken(idToken);
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";

    const result = await authenticateOrRegisterGoogleUser(verifiedIdentity, deviceInfo);
    setRefreshCookie(res, result.refreshToken);

    return sendOAuthResponse(
      res,
      buildRedirect({
        oauth_success: "true",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: JSON.stringify(result.user)
      })
    );
  } catch (err: any) {
    if (err.error === "AccountLinkingRequired") {
      return sendOAuthResponse(
        res,
        buildRedirect({
          error: "account_linking_required",
          message: err.message
        })
      );
    }
    return sendOAuthResponse(
      res,
      buildRedirect({
        error: err.message || "oauth_failed"
      })
    );
  }
});

/**
 * @openapi
 * /auth/google/link:
 *   post:
 *     tags: [Auth]
 *     summary: Link Google account to authenticated user
 *     description: |
 *       Explicitly links a verified Google identity to the currently authenticated LifeOS account.
 *       Rejects the operation if the Google identity is already attached to another LifeOS user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/GoogleLinkInput"
 *     responses:
 *       200:
 *         description: Google account linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: "#/components/schemas/UserProfile" }
 *       400:
 *         description: Invalid Google token
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Google account already linked to another LifeOS user
 *   delete:
 *     tags: [Auth]
 *     summary: Unlink Google account from authenticated user
 *     description: |
 *       Removes Google OAuth identity from the caller's account. Requires the user to have a
 *       password set so they are not locked out of their account.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Google account unlinked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: "#/components/schemas/UserProfile" }
 *       400:
 *         description: Cannot unlink if no password is set or no Google account is linked
 *       401:
 *         description: Authentication required
 */
authRouter.post(
  "/auth/google/link",
  requireAuth,
  validate(googleLinkSchema),
  async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const verifiedIdentity = await googleAuthService.verifyIdToken(idToken);
      const user = await linkGoogleAccountToUser(req.user!._id.toString(), verifiedIdentity);

      return res.json({
        message: "Google account linked successfully.",
        user: formatUserProfile(user)
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({
          error: err.error || "LinkingError",
          message: err.message
        });
      }
      return res.status(400).json({
        error: "BadRequest",
        message: err.message || "Failed to link Google account."
      });
    }
  }
);

authRouter.delete("/auth/google/link", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await unlinkGoogleAccountFromUser(req.user!._id.toString());
    return res.json({
      message: "Google account unlinked successfully.",
      user: formatUserProfile(user)
    });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.error || "UnlinkingError",
        message: err.message
      });
    }
    return res.status(400).json({
      error: "BadRequest",
      message: err.message || "Failed to unlink Google account."
    });
  }
});

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
      req.body?.refreshToken ||
      (req.headers["x-refresh-token"] as string) ||
      req.cookies?.refreshToken;
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
    req.body?.refreshToken ||
    (req.headers["x-refresh-token"] as string) ||
    req.cookies?.refreshToken;
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
 *     GoogleAuthInput:
 *       type: object
 *       description: Google OAuth verification payload containing client-verified ID token.
 *       required: [idToken]
 *       properties:
 *         idToken:
 *           type: string
 *           description: Google OpenID Connect ID token JWT issued to client.
 *     GoogleLinkInput:
 *       type: object
 *       description: Google OAuth link payload for authenticated user.
 *       required: [idToken]
 *       properties:
 *         idToken:
 *           type: string
 *           description: Google OpenID Connect ID token JWT issued to client.
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
 *         googleId: { type: string, nullable: true }
 *         hasPassword: { type: boolean }
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
