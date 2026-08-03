import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters long")
  .refine((val) => /[A-Za-z]/.test(val), {
    message: "Password must contain at least one letter"
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number"
  });

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").trim()
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required")
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim()
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["user", "admin"]),
  emailVerified: z.boolean(),
  status: z.enum(["active", "soft_deleted"]),
  createdAt: z.string()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
  isCurrent: z.boolean().optional()
});

export type SessionInfo = z.infer<typeof sessionSchema>;

export const authResponseSchema = z.object({
  user: userProfileSchema,
  accessToken: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
