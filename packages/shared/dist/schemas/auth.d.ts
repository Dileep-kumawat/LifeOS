import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
}, {
    email: string;
    password: string;
    name: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export declare const googleAuthSchema: z.ZodObject<{
    idToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    idToken: string;
}, {
    idToken: string;
}>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export declare const googleLinkSchema: z.ZodObject<{
    idToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    idToken: string;
}, {
    idToken: string;
}>;
export type GoogleLinkInput = z.infer<typeof googleLinkSchema>;
export declare const userProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["user", "admin"]>;
    emailVerified: z.ZodBoolean;
    status: z.ZodEnum<["active", "soft_deleted"]>;
    createdAt: z.ZodString;
    googleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasPassword: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    status: "active" | "soft_deleted";
    id: string;
    role: "user" | "admin";
    emailVerified: boolean;
    createdAt: string;
    googleId?: string | null | undefined;
    hasPassword?: boolean | undefined;
}, {
    email: string;
    name: string;
    status: "active" | "soft_deleted";
    id: string;
    role: "user" | "admin";
    emailVerified: boolean;
    createdAt: string;
    googleId?: string | null | undefined;
    hasPassword?: boolean | undefined;
}>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export declare const sessionSchema: z.ZodObject<{
    id: z.ZodString;
    deviceInfo: z.ZodString;
    issuedAt: z.ZodString;
    expiresAt: z.ZodString;
    isCurrent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    deviceInfo: string;
    issuedAt: string;
    expiresAt: string;
    isCurrent?: boolean | undefined;
}, {
    id: string;
    deviceInfo: string;
    issuedAt: string;
    expiresAt: string;
    isCurrent?: boolean | undefined;
}>;
export type SessionInfo = z.infer<typeof sessionSchema>;
export declare const authResponseSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<["user", "admin"]>;
        emailVerified: z.ZodBoolean;
        status: z.ZodEnum<["active", "soft_deleted"]>;
        createdAt: z.ZodString;
        googleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        hasPassword: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name: string;
        status: "active" | "soft_deleted";
        id: string;
        role: "user" | "admin";
        emailVerified: boolean;
        createdAt: string;
        googleId?: string | null | undefined;
        hasPassword?: boolean | undefined;
    }, {
        email: string;
        name: string;
        status: "active" | "soft_deleted";
        id: string;
        role: "user" | "admin";
        emailVerified: boolean;
        createdAt: string;
        googleId?: string | null | undefined;
        hasPassword?: boolean | undefined;
    }>;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user: {
        email: string;
        name: string;
        status: "active" | "soft_deleted";
        id: string;
        role: "user" | "admin";
        emailVerified: boolean;
        createdAt: string;
        googleId?: string | null | undefined;
        hasPassword?: boolean | undefined;
    };
    accessToken: string;
}, {
    user: {
        email: string;
        name: string;
        status: "active" | "soft_deleted";
        id: string;
        role: "user" | "admin";
        emailVerified: boolean;
        createdAt: string;
        googleId?: string | null | undefined;
        hasPassword?: boolean | undefined;
    };
    accessToken: string;
}>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
