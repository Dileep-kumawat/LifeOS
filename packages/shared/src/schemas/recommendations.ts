import { z } from "zod";

/**
 * Recommendation period cadence: weekly or monthly.
 */
export const recommendationPeriodSchema = z.enum(["weekly", "monthly"]);
export type RecommendationPeriod = z.infer<typeof recommendationPeriodSchema>;

/**
 * Domain category for a single recommendation.
 */
export const recommendationDomainSchema = z.enum([
  "productivity",
  "finance",
  "habits",
  "general"
]);
export type RecommendationDomain = z.infer<typeof recommendationDomainSchema>;

/**
 * Impact severity level of the recommendation.
 */
export const recommendationImpactSchema = z.enum(["high", "medium", "low"]);
export type RecommendationImpact = z.infer<typeof recommendationImpactSchema>;

/**
 * A single structured recommendation item.
 */
export const recommendationItemSchema = z.object({
  id: z.string().optional(),
  domain: recommendationDomainSchema.default("general"),
  title: z.string().min(1, "title is required"),
  category: z.string().default("general"),
  message: z.string().min(1, "message is required"),
  actionableStep: z.string().min(1, "actionableStep is required"),
  metricGrounded: z.string().optional(),
  impact: recommendationImpactSchema.default("medium")
});
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;

/**
 * Full recommendation document schema.
 */
export const recommendationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  period: recommendationPeriodSchema,
  periodStart: z.string(), // Normalized YYYY-MM-DD
  periodEnd: z.string(),   // Normalized YYYY-MM-DD
  recommendations: z.array(recommendationItemSchema),
  generatedAt: z.string()
});
export type Recommendation = z.infer<typeof recommendationSchema>;

/**
 * Status response for latest recommendation retrieval.
 */
export const latestRecommendationResponseSchema = z.object({
  generated: z.boolean(),
  period: recommendationPeriodSchema,
  reason: z.string().nullable().optional(),
  deliveryTime: z.string().optional(),
  recommendation: recommendationSchema.nullable()
});
export type LatestRecommendationResponse = z.infer<
  typeof latestRecommendationResponseSchema
>;
