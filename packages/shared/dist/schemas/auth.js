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
export const loginSchema = z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required")
});
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim()
});
export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema
});
export const googleAuthSchema = z.object({
    idToken: z.string().min(1, "Google ID token is required")
});
export const googleLinkSchema = z.object({
    idToken: z.string().min(1, "Google ID token is required")
});
export const userProfileSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["user", "admin"]),
    emailVerified: z.boolean(),
    status: z.enum(["active", "soft_deleted"]),
    createdAt: z.string(),
    googleId: z.string().nullable().optional(),
    hasPassword: z.boolean().optional()
});
export const sessionSchema = z.object({
    id: z.string(),
    deviceInfo: z.string(),
    issuedAt: z.string(),
    expiresAt: z.string(),
    isCurrent: z.boolean().optional()
});
export const authResponseSchema = z.object({
    user: userProfileSchema,
    accessToken: z.string()
});
