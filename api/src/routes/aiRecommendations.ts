import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Recommendation } from "../models/Recommendation.js";
import { logger } from "../logger.js";

export const aiRecommendationsRouter = Router();

aiRecommendationsRouter.use(requireAuth);

function formatRecommendation(doc: any) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    period: doc.period,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    recommendations: (doc.recommendations || []).map((item: any) => ({
      id: item.id || undefined,
      domain: item.domain || "general",
      title: item.title,
      category: item.category || "general",
      message: item.message,
      actionableStep: item.actionableStep,
      metricGrounded: item.metricGrounded || undefined,
      impact: item.impact || "medium"
    })),
    generatedAt: doc.generatedAt
      ? typeof doc.generatedAt === "string"
        ? doc.generatedAt
        : doc.generatedAt.toISOString()
      : new Date().toISOString()
  };
}

/**
 * @openapi
 * /ai/recommendations/latest:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get latest periodic AI recommendations
 *     description: |
 *       Retrieves the latest scheduled AI recommendations for the user on a weekly or monthly cadence (FR-10.3).
 *       Reuses Phase 3's `callAI()` infrastructure and Prompt 1's productivity and finance aggregation logic.
 *       Returns structured recommendation objects grounded in real user metrics. If no recommendation has been generated yet for the current period, returns `generated: false`.
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly]
 *           default: weekly
 *         description: Cadence period to retrieve
 *     responses:
 *       200:
 *         description: Latest recommendation document or status state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated: { type: boolean }
 *                 period: { type: string, enum: [weekly, monthly] }
 *                 reason: { type: string, nullable: true }
 *                 recommendation:
 *                   $ref: "#/components/schemas/Recommendation"
 *             examples:
 *               populated:
 *                 value:
 *                   generated: true
 *                   period: "weekly"
 *                   recommendation:
 *                     id: "662c9f1e9f0b2a001c3d4e90"
 *                     userId: "662c9f1e9f0b2a001c3d4e5a"
 *                     period: "weekly"
 *                     periodStart: "2026-08-24"
 *                     periodEnd: "2026-08-30"
 *                     recommendations:
 *                       - id: "rec-1"
 *                         domain: "finance"
 *                         title: "Rebalance Dining Out Budget"
 *                         category: "Dining Out"
 *                         message: "Your Dining Out spend reached $280, exceeding your $250 monthly budget."
 *                         actionableStep: "Set an 80% spending threshold alert and prepare meals at home this week."
 *                         metricGrounded: "$280 spent / $250 limit (112%)"
 *                         impact: "high"
 *                       - id: "rec-2"
 *                         domain: "habits"
 *                         title: "Strengthen Weekend Habit Consistency"
 *                         category: "Morning 30-min run"
 *                         message: "Habit consistency dropped on weekends (40% vs 90% weekdays)."
 *                         actionableStep: "Try a lighter 15-minute weekend jogging goal to maintain streak."
 *                         metricGrounded: "40% weekend completion rate"
 *                         impact: "medium"
 *                     generatedAt: "2026-08-31T08:00:00.000Z"
 *               notYetGenerated:
 *                 value:
 *                   generated: false
 *                   period: "weekly"
 *                   reason: "not_yet_generated"
 *                   recommendation: null
 *       400:
 *         description: Invalid period parameter (must be weekly or monthly)
 *       401:
 *         description: Authentication required
 */
aiRecommendationsRouter.get("/ai/recommendations/latest", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const period = (req.query.period as string) || "weekly";

    if (period !== "weekly" && period !== "monthly") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid period parameter. Must be 'weekly' or 'monthly'."
      });
    }

    const recommendationDoc = await Recommendation.findOne({ userId, period }).sort({
      generatedAt: -1,
      periodStart: -1
    });

    if (recommendationDoc) {
      return res.status(200).json({
        generated: true,
        period,
        recommendation: formatRecommendation(recommendationDoc)
      });
    }

    return res.status(200).json({
      generated: false,
      period,
      reason: "not_yet_generated",
      recommendation: null
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch latest recommendations");
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to fetch latest recommendations"
    });
  }
});

/**
 * @openapi
 * /ai/recommendations/{id}:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get historical recommendation by ID
 *     description: Returns a specific historical periodic recommendation document by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectID of the recommendation document
 *     responses:
 *       200:
 *         description: Historical recommendation document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated: { type: boolean }
 *                 period: { type: string, enum: [weekly, monthly] }
 *                 recommendation:
 *                   $ref: "#/components/schemas/Recommendation"
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Recommendation document not found
 *       401:
 *         description: Authentication required
 */
aiRecommendationsRouter.get("/ai/recommendations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id.toString();

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid recommendation ID."
      });
    }

    const recommendationDoc = await Recommendation.findOne({ _id: id, userId });

    if (!recommendationDoc) {
      return res.status(404).json({
        error: "NotFound",
        message: `Recommendation not found with ID ${id}`
      });
    }

    return res.status(200).json({
      generated: true,
      period: recommendationDoc.period,
      recommendation: formatRecommendation(recommendationDoc)
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, "Failed to fetch recommendation by ID");
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to fetch recommendation"
    });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     RecommendationItem:
 *       type: object
 *       required: [title, category, message, actionableStep, domain, impact]
 *       properties:
 *         id: { type: string }
 *         domain:
 *           type: string
 *           enum: [productivity, finance, habits, general]
 *         title: { type: string }
 *         category: { type: string }
 *         message: { type: string }
 *         actionableStep: { type: string }
 *         metricGrounded: { type: string }
 *         impact:
 *           type: string
 *           enum: [high, medium, low]
 *     Recommendation:
 *       type: object
 *       required: [id, userId, period, periodStart, periodEnd, recommendations, generatedAt]
 *       properties:
 *         id: { type: string }
 *         userId: { type: string }
 *         period:
 *           type: string
 *           enum: [weekly, monthly]
 *         periodStart: { type: string, example: "2026-08-24" }
 *         periodEnd: { type: string, example: "2026-08-30" }
 *         recommendations:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/RecommendationItem"
 *         generatedAt: { type: string, format: date-time }
 */
