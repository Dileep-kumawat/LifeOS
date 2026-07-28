export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PREMIUM = 'premium',
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
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
