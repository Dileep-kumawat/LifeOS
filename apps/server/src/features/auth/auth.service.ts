import crypto from 'crypto';
import { UserModel, IUserDocument } from './models/User.model.js';
import { SessionModel } from './models/Session.model.js';
import { RefreshTokenModel } from './models/RefreshToken.model.js';
import { PasswordUtil } from '../../utils/password.util.js';
import { JwtUtil } from '../../utils/jwt.util.js';
import { AppError } from '../../core/errors/AppError.js';
import {
  AuthResponse,
  AuthTokens,
  RegisterInput,
  LoginInput,
  UserRole,
} from '@lifeos/shared';

export class AuthService {
  private static parseDurationToMs(durationStr: string): number {
    const unit = durationStr.slice(-1);
    const value = parseInt(durationStr.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  public static async issueTokensAndSession(
    user: IUserDocument,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const sessionExpiresMs = this.parseDurationToMs('7d');
    const sessionExpiresAt = new Date(Date.now() + sessionExpiresMs);

    // Create session
    const session = await SessionModel.create({
      userId: user._id,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      isValid: true,
      expiresAt: sessionExpiresAt,
    });

    // Access Token
    const accessToken = JwtUtil.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session._id.toString(),
    });

    // Refresh Token record
    const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
    const refreshTokenRecord = await RefreshTokenModel.create({
      userId: user._id,
      sessionId: session._id,
      token: refreshTokenRaw,
      isRevoked: false,
      expiresAt: sessionExpiresAt,
    });

    const refreshTokenJwt = JwtUtil.generateRefreshToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      tokenId: refreshTokenRecord._id.toString(),
    });

    return {
      accessToken,
      refreshToken: `${refreshTokenRecord._id.toString()}:${refreshTokenRaw}:${refreshTokenJwt}`,
      expiresIn: 15 * 60,
    };
  }

  public static async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const existingUser = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw AppError.conflict('An account with this email address already exists');
    }

    if (!input.password || input.password.length < 6) {
      throw AppError.badRequest('Password must be at least 6 characters long');
    }

    const hashedPassword = await PasswordUtil.hash(input.password);

    const user = await UserModel.create({
      email: input.email.toLowerCase(),
      password: hashedPassword,
      name: input.name,
      role: UserRole.USER,
      authProvider: 'local',
    });

    const tokens = await this.issueTokensAndSession(user, ipAddress, userAgent);

    return {
      user: user.toJSON() as any,
      tokens,
    };
  }

  public static async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await PasswordUtil.compare(input.password || '', user.password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const tokens = await this.issueTokensAndSession(user, ipAddress, userAgent);

    return {
      user: user.toJSON() as any,
      tokens,
    };
  }

  public static async refreshToken(refreshTokenStr: string): Promise<AuthTokens> {
    if (!refreshTokenStr) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const parts = refreshTokenStr.split(':');
    if (parts.length !== 3) {
      throw AppError.unauthorized('Invalid refresh token format');
    }

    const [tokenId, rawToken, jwtToken] = parts;

    let payload;
    try {
      payload = JwtUtil.verifyRefreshToken(jwtToken);
    } catch {
      throw AppError.unauthorized('Expired or invalid refresh token');
    }

    const tokenRecord = await RefreshTokenModel.findById(tokenId);
    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.token !== rawToken) {
      throw AppError.unauthorized('Refresh token has been revoked or is invalid');
    }

    const session = await SessionModel.findById(payload.sessionId);
    if (!session || !session.isValid) {
      throw AppError.unauthorized('Session has been terminated');
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    // Revoke old refresh token (rotation)
    tokenRecord.isRevoked = true;
    await tokenRecord.save();

    // Issue new tokens & update session
    return this.issueTokensAndSession(user, session.ipAddress, session.userAgent);
  }

  public static async logout(sessionId: string, refreshTokenStr?: string): Promise<void> {
    if (sessionId) {
      await SessionModel.findByIdAndUpdate(sessionId, { isValid: false });
    }

    if (refreshTokenStr) {
      const parts = refreshTokenStr.split(':');
      if (parts.length === 3) {
        await RefreshTokenModel.findByIdAndUpdate(parts[0], { isRevoked: true });
      }
    }
  }

  public static async getSessions(userId: string): Promise<any[]> {
    const sessions = await SessionModel.find({ userId, isValid: true }).sort({ updatedAt: -1 });
    return sessions.map((s) => s.toJSON());
  }

  public static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await SessionModel.findOneAndUpdate({ _id: sessionId, userId }, { isValid: false });
  }
}
