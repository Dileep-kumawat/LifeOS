export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  PREMIUM: 'premium',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  authProvider: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface ISession {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
}

export interface RegisterInput {
  email: string;
  password?: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password?: string;
}

export interface GoogleAuthInput {
  idToken?: string;
}
