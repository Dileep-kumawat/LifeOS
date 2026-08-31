import { z } from "zod";
/**
 * Recommendation period cadence: weekly or monthly.
 */
export declare const recommendationPeriodSchema: z.ZodEnum<["weekly", "monthly"]>;
export type RecommendationPeriod = z.infer<typeof recommendationPeriodSchema>;
/**
 * Domain category for a single recommendation.
 */
export declare const recommendationDomainSchema: z.ZodEnum<["productivity", "finance", "habits", "general"]>;
export type RecommendationDomain = z.infer<typeof recommendationDomainSchema>;
/**
 * Impact severity level of the recommendation.
 */
export declare const recommendationImpactSchema: z.ZodEnum<["high", "medium", "low"]>;
export type RecommendationImpact = z.infer<typeof recommendationImpactSchema>;
/**
 * A single structured recommendation item.
 */
export declare const recommendationItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    domain: z.ZodDefault<z.ZodEnum<["productivity", "finance", "habits", "general"]>>;
    title: z.ZodString;
    category: z.ZodDefault<z.ZodString>;
    message: z.ZodString;
    actionableStep: z.ZodString;
    metricGrounded: z.ZodOptional<z.ZodString>;
    impact: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    title: string;
    category: string;
    domain: "habits" | "productivity" | "finance" | "general";
    actionableStep: string;
    impact: "low" | "medium" | "high";
    id?: string | undefined;
    metricGrounded?: string | undefined;
}, {
    message: string;
    title: string;
    actionableStep: string;
    id?: string | undefined;
    category?: string | undefined;
    domain?: "habits" | "productivity" | "finance" | "general" | undefined;
    metricGrounded?: string | undefined;
    impact?: "low" | "medium" | "high" | undefined;
}>;
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;
/**
 * Full recommendation document schema.
 */
export declare const recommendationSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    period: z.ZodEnum<["weekly", "monthly"]>;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    recommendations: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        domain: z.ZodDefault<z.ZodEnum<["productivity", "finance", "habits", "general"]>>;
        title: z.ZodString;
        category: z.ZodDefault<z.ZodString>;
        message: z.ZodString;
        actionableStep: z.ZodString;
        metricGrounded: z.ZodOptional<z.ZodString>;
        impact: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        title: string;
        category: string;
        domain: "habits" | "productivity" | "finance" | "general";
        actionableStep: string;
        impact: "low" | "medium" | "high";
        id?: string | undefined;
        metricGrounded?: string | undefined;
    }, {
        message: string;
        title: string;
        actionableStep: string;
        id?: string | undefined;
        category?: string | undefined;
        domain?: "habits" | "productivity" | "finance" | "general" | undefined;
        metricGrounded?: string | undefined;
        impact?: "low" | "medium" | "high" | undefined;
    }>, "many">;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    generatedAt: string;
    period: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    recommendations: {
        message: string;
        title: string;
        category: string;
        domain: "habits" | "productivity" | "finance" | "general";
        actionableStep: string;
        impact: "low" | "medium" | "high";
        id?: string | undefined;
        metricGrounded?: string | undefined;
    }[];
}, {
    id: string;
    userId: string;
    generatedAt: string;
    period: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    recommendations: {
        message: string;
        title: string;
        actionableStep: string;
        id?: string | undefined;
        category?: string | undefined;
        domain?: "habits" | "productivity" | "finance" | "general" | undefined;
        metricGrounded?: string | undefined;
        impact?: "low" | "medium" | "high" | undefined;
    }[];
}>;
export type Recommendation = z.infer<typeof recommendationSchema>;
/**
 * Status response for latest recommendation retrieval.
 */
export declare const latestRecommendationResponseSchema: z.ZodObject<{
    generated: z.ZodBoolean;
    period: z.ZodEnum<["weekly", "monthly"]>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deliveryTime: z.ZodOptional<z.ZodString>;
    recommendation: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        period: z.ZodEnum<["weekly", "monthly"]>;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        recommendations: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            domain: z.ZodDefault<z.ZodEnum<["productivity", "finance", "habits", "general"]>>;
            title: z.ZodString;
            category: z.ZodDefault<z.ZodString>;
            message: z.ZodString;
            actionableStep: z.ZodString;
            metricGrounded: z.ZodOptional<z.ZodString>;
            impact: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        }, "strip", z.ZodTypeAny, {
            message: string;
            title: string;
            category: string;
            domain: "habits" | "productivity" | "finance" | "general";
            actionableStep: string;
            impact: "low" | "medium" | "high";
            id?: string | undefined;
            metricGrounded?: string | undefined;
        }, {
            message: string;
            title: string;
            actionableStep: string;
            id?: string | undefined;
            category?: string | undefined;
            domain?: "habits" | "productivity" | "finance" | "general" | undefined;
            metricGrounded?: string | undefined;
            impact?: "low" | "medium" | "high" | undefined;
        }>, "many">;
        generatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        userId: string;
        generatedAt: string;
        period: "weekly" | "monthly";
        periodStart: string;
        periodEnd: string;
        recommendations: {
            message: string;
            title: string;
            category: string;
            domain: "habits" | "productivity" | "finance" | "general";
            actionableStep: string;
            impact: "low" | "medium" | "high";
            id?: string | undefined;
            metricGrounded?: string | undefined;
        }[];
    }, {
        id: string;
        userId: string;
        generatedAt: string;
        period: "weekly" | "monthly";
        periodStart: string;
        periodEnd: string;
        recommendations: {
            message: string;
            title: string;
            actionableStep: string;
            id?: string | undefined;
            category?: string | undefined;
            domain?: "habits" | "productivity" | "finance" | "general" | undefined;
            metricGrounded?: string | undefined;
            impact?: "low" | "medium" | "high" | undefined;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    period: "weekly" | "monthly";
    generated: boolean;
    recommendation: {
        id: string;
        userId: string;
        generatedAt: string;
        period: "weekly" | "monthly";
        periodStart: string;
        periodEnd: string;
        recommendations: {
            message: string;
            title: string;
            category: string;
            domain: "habits" | "productivity" | "finance" | "general";
            actionableStep: string;
            impact: "low" | "medium" | "high";
            id?: string | undefined;
            metricGrounded?: string | undefined;
        }[];
    } | null;
    deliveryTime?: string | undefined;
    reason?: string | null | undefined;
}, {
    period: "weekly" | "monthly";
    generated: boolean;
    recommendation: {
        id: string;
        userId: string;
        generatedAt: string;
        period: "weekly" | "monthly";
        periodStart: string;
        periodEnd: string;
        recommendations: {
            message: string;
            title: string;
            actionableStep: string;
            id?: string | undefined;
            category?: string | undefined;
            domain?: "habits" | "productivity" | "finance" | "general" | undefined;
            metricGrounded?: string | undefined;
            impact?: "low" | "medium" | "high" | undefined;
        }[];
    } | null;
    deliveryTime?: string | undefined;
    reason?: string | null | undefined;
}>;
export type LatestRecommendationResponse = z.infer<typeof latestRecommendationResponseSchema>;
