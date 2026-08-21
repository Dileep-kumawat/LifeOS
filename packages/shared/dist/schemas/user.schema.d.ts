import { z } from "zod";
export declare const userPublicSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    createdAt: string;
    displayName?: string | undefined;
}, {
    email: string;
    id: string;
    createdAt: string;
    displayName?: string | undefined;
}>;
export type UserPublic = z.infer<typeof userPublicSchema>;
