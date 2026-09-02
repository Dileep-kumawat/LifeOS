import { env } from "../config/env.js";
import { logger } from "../logger.js";

export interface GoogleVerifiedIdentity {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export type GoogleTokenVerifierFn = (idToken: string) => Promise<GoogleVerifiedIdentity>;

const VALID_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * Default live Google ID token verification implementation.
 * Queries Google's OpenID Connect tokeninfo endpoint to validate cryptographic signature,
 * audience, issuer, expiration, and user profile fields.
 */
async function defaultVerifyGoogleIdToken(idToken: string): Promise<GoogleVerifiedIdentity> {
  if (!idToken || typeof idToken !== "string" || idToken.trim().length === 0) {
    throw new Error("Invalid Google ID token: token is empty or malformed");
  }

  // Allowed audiences: Web Client ID and any Mobile / Android Client IDs configured
  const allowedAudiences: string[] = [];
  if (env.GOOGLE_CLIENT_ID) allowedAudiences.push(env.GOOGLE_CLIENT_ID);
  if (env.GOOGLE_MOBILE_CLIENT_ID) allowedAudiences.push(env.GOOGLE_MOBILE_CLIENT_ID);
  if (env.GOOGLE_ANDROID_CLIENT_ID) allowedAudiences.push(env.GOOGLE_ANDROID_CLIENT_ID);

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      logger.warn({ status: response.status }, "Google tokeninfo verification failed");
      throw new Error(`Google token validation failed: ${errorText || response.statusText}`);
    }

    const payload: any = await response.json();

    // 1. Verify Issuer
    if (!payload.iss || !VALID_ISSUERS.includes(payload.iss)) {
      throw new Error(`Invalid Google token issuer: ${payload.iss}`);
    }

    // 2. Verify Audience (if configured)
    if (allowedAudiences.length > 0 && (!payload.aud || !allowedAudiences.includes(payload.aud))) {
      throw new Error(`Invalid Google token audience: ${payload.aud}`);
    }

    // 3. Verify Expiration
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && Number(payload.exp) < nowSec) {
      throw new Error("Google ID token has expired");
    }

    // 4. Verify Subject Identifier (sub)
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("Google token is missing valid subject identifier (sub)");
    }

    // 5. Verify Email & Email Verification
    if (!payload.email || typeof payload.email !== "string") {
      throw new Error("Google token is missing email address");
    }

    const emailVerified =
      payload.email_verified === true ||
      payload.email_verified === "true" ||
      payload.email_verified === 1;

    if (!emailVerified) {
      throw new Error("Google email address is not verified");
    }

    const name = payload.name || payload.given_name || payload.email.split("@")[0] || "LifeOS User";

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: name.trim(),
      emailVerified: true
    };
  } catch (err: any) {
    logger.warn({ error: err.message }, "Google identity verification error");
    throw err;
  }
}

class GoogleAuthService {
  private verifier: GoogleTokenVerifierFn = defaultVerifyGoogleIdToken;

  /**
   * Override the token verifier function (used in tests for deterministic mocking).
   */
  public setVerifier(verifier: GoogleTokenVerifierFn): void {
    this.verifier = verifier;
  }

  /**
   * Reset to the default production verifier.
   */
  public resetVerifier(): void {
    this.verifier = defaultVerifyGoogleIdToken;
  }

  /**
   * Verifies a Google ID token and returns the cryptographically verified user identity.
   */
  public async verifyIdToken(idToken: string): Promise<GoogleVerifiedIdentity> {
    return this.verifier(idToken);
  }
}

export const googleAuthService = new GoogleAuthService();
