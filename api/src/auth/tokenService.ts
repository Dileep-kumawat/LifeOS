import crypto from "crypto";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";
import type { UserDoc } from "../models/User.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const COOKIE_NAME = "refreshToken";

export function generateAccessToken(user: UserDoc): string {
  const payload = {
    userId: user._id.toString(),
    role: user.role
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m"
  });
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(
  userId: string,
  deviceInfo: string,
  existingFamilyId?: string
): Promise<{ rawToken: string; familyId: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const familyId = existingFamilyId || crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await RefreshToken.create({
    tokenHash,
    userId,
    familyId,
    deviceInfo,
    expiresAt,
    issuedAt: new Date()
  });

  return { rawToken, familyId, expiresAt };
}

const GRACE_PERIOD_MS = 30 * 1000; // 30s grace period for concurrent / StrictMode refresh requests

export async function rotateRefreshToken(
  rawToken: string,
  deviceInfo: string
): Promise<{ newRawToken: string; userId: string }> {
  const tokenHash = hashToken(rawToken);
  const existingToken = await RefreshToken.findOne({ tokenHash });

  if (!existingToken) {
    throw new Error("Invalid refresh token");
  }

  // Token Reuse / Theft Detection: If token was already revoked
  if (existingToken.revokedAt) {
    const timeSinceRevocation = Date.now() - existingToken.revokedAt.getTime();

    // If within grace period (e.g. concurrent requests, React StrictMode double effect, multiple tabs)
    if (timeSinceRevocation <= GRACE_PERIOD_MS) {
      // Revoke any active tokens in the family and issue a single fresh token
      await RefreshToken.updateMany(
        { familyId: existingToken.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );

      const { rawToken: newRawToken } = await createRefreshToken(
        existingToken.userId.toString(),
        deviceInfo,
        existingToken.familyId
      );

      return {
        newRawToken,
        userId: existingToken.userId.toString()
      };
    }

    // Outside grace period: real token reuse / theft detected! Revoke entire family.
    await RefreshToken.updateMany(
      { familyId: existingToken.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw new Error("Security alert: Revoked refresh token reused. All sessions revoked.");
  }

  if (existingToken.expiresAt < new Date()) {
    throw new Error("Refresh token expired");
  }

  // Revoke current token
  existingToken.revokedAt = new Date();
  await existingToken.save();

  // Issue new token in same family
  const { rawToken: newRawToken } = await createRefreshToken(
    existingToken.userId.toString(),
    deviceInfo,
    existingToken.familyId
  );

  return {
    newRawToken,
    userId: existingToken.userId.toString()
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export function setRefreshCookie(res: Response, rawToken: string): void {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearRefreshCookie(res: Response): void {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
}
