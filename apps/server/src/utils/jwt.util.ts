import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signJwt = (
  payload: object,
  options?: SignOptions,
): string => {
  return jwt.sign(payload, env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN as any,
    ...options,
  });
};

export const verifyJwt = <T = any>(token: string): T => {
  return jwt.verify(token, env.JWT_SECRET as Secret) as T;
};
